"""
Ingest KICD curriculum design JSON (extracted via Docling) into ChromaDB.

KICD curriculum designs are TABLE-based, not heading-paragraph based.
Confirmed structure (from inspect_json.py output on a real KICD file):

  - "Curriculum" tables: 5 columns
      Strand | Sub strand | Specific learning outcomes |
      Suggested learning experiences | Suggested Key inquiry question(s)
    One data row = one sub-strand.

  - "Rubric" tables: 5 columns
      Level Indicator | Exceeds Expectations | Meets Expectations |
      Approaches Expectations | Below Expectations
    These appear right after the curriculum table(s) for a strand, but do
    NOT contain the strand name themselves -- we attribute each rubric
    table to whichever strand most recently appeared, based on document
    order. If a document interleaves these unusually, spot-check the
    output.

  - "Assessment" tables: 4 columns
      Strand | Suggested Assessment Methods | Suggested Learning Resources |
      Suggested Non-formal Activities
    These DO contain the strand name per row, so they're merged back onto
    the matching curriculum chunk(s) by strand-name match.

KNOWN GAP: Pertinent and Contemporary Issues (PCIs) and Core Competencies
do not appear as their own table columns in the sample inspected. They may
exist as body text elsewhere in the document. This script does NOT
fabricate them -- each chunk's "pcis" and "core_competencies" metadata
fields are left empty, and the agent's system prompt should be told not to
claim PCIs came from KICD unless they were actually retrieved. If you find
PCIs elsewhere in your documents (e.g. a dedicated table or heading),
tell me the pattern and I'll add extraction for it.

Usage:
    1. Docling JSON files go in "docling_json/"
    2. Set GEMINI_API_KEY (via .env or environment variable)
    3. python ingest.py            (python ingest.py --dry-run parses and
                                    reports without embedding or writing)

Re-running is safe: each file's chunks are replaced, not duplicated.
"""

import json
import os
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

# Same as backend/chroma.py: verify TLS against the OS certificate store, so
# antivirus HTTPS scanning (which re-signs Google's certificate with a root only
# the OS trusts) does not fail every embedding call. Must run before google-genai
# is imported.
try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

import chromadb
from gemini_embedding import GeminiEmbeddingFunction
from bedrock_embedding import BedrockEmbeddingFunction


DOCLING_JSON_DIR = Path("docling_json")
CHROMA_DB_PATH = "./kicd_chroma_db"
COLLECTION_NAME = "kicd_curriculum"

GRADE_SUBJECT_PATTERN = re.compile(r"^([A-Z][A-Za-z\s\-]+?)\s+GRADE\s+(\d+)\s*$")
LESSON_COUNT_PATTERN = re.compile(r"\((\d+)\s*lessons?\)", re.IGNORECASE)


def cell_text(cell: dict) -> str:
    return (cell.get("text") or "").strip()


def get_grid(table: dict) -> list[list[dict]]:
    return table.get("data", {}).get("grid", [])


def get_page_no(item: dict) -> int:
    prov = item.get("prov") or []
    return prov[0].get("page_no", 0) if prov else 0


def classify_table(headers: list[str]) -> str:
    h = [x.lower() for x in headers]
    joined = " | ".join(h)
    if "strand" in joined and "sub strand" in joined and "specific learning outcomes" in joined:
        return "curriculum"
    if "level indicator" in joined and "exceeds expectations" in joined:
        return "rubric"
    if "strand" in joined and "suggested assessment methods" in joined:
        return "assessment"
    return "other"


def extract_grade_subject(doc_dict: dict, filename: str) -> tuple[str, str]:
    """Look for a 'SUBJECT GRADE N' section header near the start of the
    document (this is how KICD title pages are formatted). Falls back to
    a filename guess if not found -- check the printed result either way,
    since a wrong grade/subject silently breaks retrieval filtering later."""
    for item in doc_dict.get("texts", [])[:15]:
        if item.get("label") != "section_header":
            continue
        text = item.get("text", "").strip()
        m = GRADE_SUBJECT_PATTERN.match(text)
        if m:
            subject = m.group(1).strip().title()
            grade = f"Grade {m.group(2)}"
            return grade, subject

    # Fallback: guess from filename
    stem = Path(filename).stem
    grade_m = re.search(r"grade[\s\-_]*(\d+)", stem, re.IGNORECASE)
    grade = f"Grade {grade_m.group(1)}" if grade_m else "Unknown"
    subject_guess = re.sub(r"grade[\s\-_]*\d+", "", stem, flags=re.IGNORECASE)
    subject_guess = re.sub(r"[\-_]+", " ", subject_guess).strip().title() or "Unknown"
    print(f"  (!) Could not find 'SUBJECT GRADE N' header text -- "
          f"guessed '{grade}' / '{subject_guess}' from filename. Verify this.")
    return grade, subject_guess


# The subject names the app shows, keyed by a word that identifies the subject
# in whatever extract_grade_subject() found -- a clean title-page header, or a
# filename guess like "Agriculture 30.07.2024" or "Cre Design Revised". Checked
# in order; the first match wins.
CANONICAL_SUBJECTS = [
    ("christian religious", "Christian Religious Education"),
    ("cre", "Christian Religious Education"),
    ("creative arts", "Creative Arts"),
    ("agriculture", "Agriculture"),
    ("english", "English"),
    ("indigenous", "Indigenous Languages"),
    ("arabic", "Arabic"),
]


def canonical_subject(raw: str) -> str:
    words = " ".join(re.findall(r"[a-z]+", raw.lower()))
    for key, name in CANONICAL_SUBJECTS:
        if re.search(rf"\b{key}\b", words):
            return name
    print(f"  (!) No canonical name for subject {raw!r} -- stored as is. "
          f"Add it to CANONICAL_SUBJECTS if it is wrong.")
    return raw


def parse_curriculum_tables(doc_dict: dict) -> list[dict]:
    """Returns one dict per sub-strand row, in document order, tagged with
    the table's page number for later rubric attribution."""
    rows = []
    for table in doc_dict.get("tables", []):
        grid = get_grid(table)
        if not grid:
            continue
        headers = [cell_text(c) for c in grid[0]]
        kind = classify_table(headers)
        if kind != "curriculum":
            continue

        page_no = get_page_no(table)
        for data_row in grid[1:]:
            if len(data_row) < 5:
                continue
            strand = cell_text(data_row[0])
            sub_strand = cell_text(data_row[1])
            if not strand or not sub_strand:
                continue
            lesson_m = LESSON_COUNT_PATTERN.search(sub_strand)
            rows.append({
                "strand": strand,
                "sub_strand": sub_strand,
                "num_lessons": lesson_m.group(1) if lesson_m else "",
                "specific_learning_outcomes": cell_text(data_row[2]),
                "suggested_learning_experiences": cell_text(data_row[3]),
                "key_inquiry_question": cell_text(data_row[4]),
                "page_no": page_no,
                "assessment_methods": "",
                "learning_resources": "",
                "non_formal_activities": "",
                "rubric_text": "",
            })
    return rows


def parse_assessment_tables(doc_dict: dict) -> dict[str, dict]:
    """Returns {strand_name_lower: {assessment_methods, learning_resources,
    non_formal_activities}} keyed by strand text as it appears in the
    assessment table (matched case-insensitively against curriculum rows
    later)."""
    by_strand = {}
    for table in doc_dict.get("tables", []):
        grid = get_grid(table)
        if not grid:
            continue
        headers = [cell_text(c) for c in grid[0]]
        if classify_table(headers) != "assessment":
            continue
        for data_row in grid[1:]:
            if len(data_row) < 4:
                continue
            strand = cell_text(data_row[0])
            if not strand:
                continue
            by_strand[strand.lower()] = {
                "assessment_methods": cell_text(data_row[1]),
                "learning_resources": cell_text(data_row[2]),
                "non_formal_activities": cell_text(data_row[3]),
            }
    return by_strand


def parse_rubric_tables_in_order(doc_dict: dict) -> list[tuple[int, str]]:
    """Returns [(page_no, rubric_text), ...] in document order. Rubric
    tables don't carry a strand name, so we attribute them to the nearest
    PRECEDING curriculum strand by page number during merging."""
    rubrics = []
    for table in doc_dict.get("tables", []):
        grid = get_grid(table)
        if not grid:
            continue
        headers = [cell_text(c) for c in grid[0]]
        if classify_table(headers) != "rubric":
            continue
        page_no = get_page_no(table)
        lines = [" | ".join(headers)]
        for data_row in grid[1:]:
            lines.append(" | ".join(cell_text(c) for c in data_row))
        rubrics.append((page_no, "\n".join(lines)))
    return rubrics


def attach_rubrics(curriculum_rows: list[dict], rubrics: list[tuple[int, str]]) -> None:
    """For each rubric, attach it to every curriculum row whose strand
    matches the most recent curriculum row appearing before that rubric's
    page. In practice: find the curriculum row with the largest page_no
    that is <= the rubric's page_no, then attach to all rows sharing that
    row's strand."""
    if not curriculum_rows:
        return
    for rubric_page, rubric_text in rubrics:
        candidates = [r for r in curriculum_rows if r["page_no"] <= rubric_page]
        anchor = max(candidates, key=lambda r: r["page_no"]) if candidates else curriculum_rows[0]
        target_strand = anchor["strand"]
        for row in curriculum_rows:
            if row["strand"] == target_strand and not row["rubric_text"]:
                row["rubric_text"] = rubric_text


def attach_assessment(curriculum_rows: list[dict], assessment_by_strand: dict[str, dict]) -> None:
    for row in curriculum_rows:
        info = assessment_by_strand.get(row["strand"].lower())
        if info:
            row["assessment_methods"] = info["assessment_methods"]
            row["learning_resources"] = info["learning_resources"]
            row["non_formal_activities"] = info["non_formal_activities"]


# ---------------------------------------------------------------------------
# Lenient parser, used only when the strict one finds no curriculum table.
#
# Written for the CRE designs, whose Docling output breaks every assumption
# above: "Sub-Strand" / "Sub- Strand" / "Sub-Stand" headers, a singular
# "Specific Learning Outcome", Strand and Sub-strand merged into one column,
# tables continuing onto the next page with no header row, cells whose text is
# repeated, and "Core competencies" side-column text bleeding into cells.
# Files the strict parser already handles never reach this code, so their
# chunks cannot change because of it.
# ---------------------------------------------------------------------------

# "2.2", "3.8.1" -- a sub-strand number. "3.0" is a strand, so the part after
# the first dot may not start with 0.
SUB_STRAND_NUMBER = re.compile(r"(?<![\d.])(\d{1,2})\s*\.\s*([1-9]\d?(?:\.\d{1,2})?)(?![\d.])")
STRAND_NUMBER = re.compile(r"(?<![\d.])(\d{1,2})\s*\.\s*0(?![\d.])\s+")
LOOSE_LESSON_COUNT = re.compile(r"\(?\s*(\d+)\s*(?:lessons?|sessions?)\s*\)?", re.IGNORECASE)
GUIDED_TO = re.compile(r"(?:the\s+)?learners?\s+(?:is|are)\s+guided\s+to", re.IGNORECASE)
# Page numbers printed in a symbol font come through as Greek/Coptic letters ("ϮϬ").
JUNK_GLYPHS = re.compile(r"[ϐ-Ͽ]+")
NOISE_ROW_PREFIXES = ("core competenc", "values", "pertinent", "link")


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", JUNK_GLYPHS.sub(" ", text)).strip()


def _drop_repeated_tail(text: str, probe: int = 60) -> str:
    """Docling sometimes emits a cell's text twice (or its second half twice).
    Cut at the first point, past the first third, where a 60-char run repeats
    something already said."""
    for p in range(len(text) // 3, len(text) - probe + 1):
        if text[p:p + probe] in text[:p]:
            return text[:p].rstrip(" ,;")
    return text


def _header_kind(cells: list[str]) -> str:
    joined = " ".join(cells).lower()
    if "assessment method" in joined:
        return "assessment"
    if "indicator" in joined and "expectation" in joined:
        return "rubric"
    if "strand" in joined and ("outcome" in joined or "experience" in joined):
        return "curriculum"
    return "none"


def _column_roles(header: list[str]) -> list[set]:
    """Map each header cell to what it holds. One column can hold several
    (merged "Strand Sub-Strand", or "Specific Learning Outcomes Suggested
    Learning Experiences")."""
    roles = []
    for cell in header:
        h = cell.lower()
        r = set()
        if "strand" in h or "stand" in h:
            r.add("lead")
        if "outcome" in h:
            r.add("slo")
        if "experience" in h:
            r.add("sle")
        if "inquiry" in h or "question" in h:
            r.add("kiq")
        if r - {"lead"}:
            # "Strand 3.0 The Life of" is lead; a content header that happens
            # to contain a stray "strand" is not.
            r.discard("lead")
        roles.append(r)
    return roles


STANDARD_ROLES = [{"lead"}, {"lead"}, {"slo"}, {"sle"}, {"kiq"}]


def _continuation_roles(prev_roles: list[set], ncols: int) -> list[set]:
    if prev_roles and len(prev_roles) == ncols:
        return prev_roles
    base = prev_roles if prev_roles and len(prev_roles) > ncols else STANDARD_ROLES
    # A continuation that lost columns has lost them from the left (the
    # strand column is the one left blank on a spill-over page).
    return base[-ncols:]


def _split_row(cells: list[str], roles: list[set]) -> dict:
    out = {"lead": [], "slo": [], "sle": [], "kiq": []}
    # "lead" stays a list of cells: the sub-strand title is read from the one
    # cell that holds its number, not from the strand cell beside it.
    for text, r in zip(cells, roles):
        if not text:
            continue
        if {"slo", "sle"} <= r:
            m = GUIDED_TO.search(text)
            if m:
                out["slo"].append(text[:m.start()])
                out["sle"].append(text[m.start():])
            else:
                out["slo"].append(text)
        elif r:
            out[sorted(r)[0] if len(r) == 1 else "kiq"].append(text)
    return {k: (v if k == "lead" else " ".join(v)) for k, v in out.items()}


def _sub_strand_title(lead_cells: list[str]):
    """['3.0 The Life of Jesus Christ 3.1 The Annunciation 3 lessons'] ->
    ('3.1', '3', 'The Annunciation', leftover text after the title)."""
    for lead in lead_cells:
        m = SUB_STRAND_NUMBER.search(lead)
        if m:
            break
    else:
        return None
    number = f"{m.group(1)}.{m.group(2)}"
    prefix, rest = lead[:m.start()], lead[m.end():]
    count = LOOSE_LESSON_COUNT.search(rest)
    if count:
        name, leftover, lessons = rest[:count.start()], rest[count.end():], count.group(1)
    else:
        name, leftover, lessons = rest, "", ""
    # Words out of order: "the 10 Lepers 3 lessons 3.4 Healing 3 lessons".
    prefix_count = LOOSE_LESSON_COUNT.search(prefix)
    if prefix_count and not STRAND_NUMBER.search(prefix):
        name = f"{name} {prefix[:prefix_count.start()]}"
    # A sub-strand title that repeats itself, e.g. "4.2 Truthfulness 3 lessons 4.2 Truthfulness".
    name = _clean(name.split(number)[0]).rstrip(" :")
    return number, lessons, name, leftover


def _strand_names(lead_texts: list[str]) -> dict[str, str]:
    """Strand number -> name, by majority vote over every strand cell in the
    file, so a contaminated cell ('4.0 Christian Values Christian Values Core')
    loses to the clean ones ('4.0 Christian Values')."""
    votes = defaultdict(Counter)
    spelling = {}
    for text in lead_texts:
        for m in STRAND_NUMBER.finditer(text):
            name = text[m.end():]
            nxt = SUB_STRAND_NUMBER.search(name)
            name = _clean(name[:nxt.start()] if nxt else name).rstrip(" :")
            if not name:
                continue
            key = name.lower()
            votes[m.group(1)][key] += 1
            spelling.setdefault(key, name)
    names = {}
    for number, counter in votes.items():
        best = max(counter.items(), key=lambda kv: (kv[1], -len(kv[0])))[0]
        names[number] = spelling[best]
    return names


def _is_noise(cells: list[str]) -> bool:
    filled = [c for c in cells if c]
    if not filled:
        return True
    if filled[0].lower().startswith(NOISE_ROW_PREFIXES):
        return True
    return len(filled) > 1 and len(set(filled)) == 1


def parse_document_lenient(doc_dict: dict) -> list[dict]:
    """Curriculum rows (with assessment and rubric text attached) for designs
    the strict parser cannot read. Headerless tables are treated as
    continuations of the table kind just before them; narrow tables with no
    recognisable header (the one-column PCI/Values boxes) are skipped without
    breaking that chain. A 3-column table is kept when its header says it is
    curriculum (outcomes and experiences merged into one column)."""
    tables = []  # (kind, page, roles, rows of cell text, header row or None if continued)
    prev_kind, prev_roles = "none", None
    for table in doc_dict.get("tables", []):
        grid = get_grid(table)
        if not grid or len(grid[0]) < 3:
            continue
        rows = [[_clean(cell_text(c)) for c in r] for r in grid]
        kind = _header_kind(rows[0])
        if len(rows[0]) < 4 and kind == "none":
            continue
        header = None
        if kind != "none":
            roles = _column_roles(rows[0]) if kind == "curriculum" else None
            header, rows = rows[0], rows[1:]
        elif prev_kind in ("curriculum", "rubric", "assessment"):
            kind = prev_kind
            roles = _continuation_roles(prev_roles, len(rows[0])) if kind == "curriculum" else None
        else:
            prev_kind, prev_roles = "none", None
            continue
        tables.append((kind, get_page_no(table), roles, rows, header))
        prev_kind, prev_roles = kind, roles

    lead_texts = []
    for kind, _page, roles, rows, _header in tables:
        for r in rows:
            if kind == "curriculum":
                lead_texts.extend(c for c, role in zip(r, roles) if "lead" in role)
            elif kind == "assessment":
                lead_texts.append(" ".join(r[:2]))
    strand_names = _strand_names(lead_texts)

    by_number: dict[str, dict] = {}
    current = None
    for kind, page, roles, rows, _header in tables:
        if kind != "curriculum":
            continue
        for r in rows:
            if _is_noise(r):
                continue
            parts = _split_row(r, roles)
            parsed = _sub_strand_title(parts["lead"])
            if parsed is None:
                if current is not None:  # spill-over from the previous page
                    for key, field in (("slo", "specific_learning_outcomes"),
                                       ("sle", "suggested_learning_experiences"),
                                       ("kiq", "key_inquiry_question")):
                        if parts[key]:
                            current[field] = f"{current[field]} {parts[key]}".strip()
                continue
            number, lessons, name, leftover = parsed
            slo = parts["slo"]
            if "by the end of" in leftover.lower():
                slo = f"{leftover} {slo}"  # outcome text that landed in the sub-strand cell
            strand_no = number.split(".")[0]
            if number in by_number:
                current = by_number[number]
                current["specific_learning_outcomes"] += f" {slo}"
                current["suggested_learning_experiences"] += f" {parts['sle']}"
                current["key_inquiry_question"] += f" {parts['kiq']}"
                continue
            current = {
                "strand": f"{strand_no}.0 {strand_names.get(strand_no, '')}".strip(),
                "sub_strand": f"{number} {name}" + (f" ({lessons} lessons)" if lessons else ""),
                "sub_strand_number": number,
                "num_lessons": lessons,
                "specific_learning_outcomes": slo,
                "suggested_learning_experiences": parts["sle"],
                "key_inquiry_question": parts["kiq"],
                "page_no": page,
                "assessment_methods": "",
                "learning_resources": "",
                "non_formal_activities": "",
                "rubric_text": "",
            }
            by_number[number] = current

    rows_out = list(by_number.values())
    for row in rows_out:
        for field in ("specific_learning_outcomes", "suggested_learning_experiences", "key_inquiry_question"):
            row[field] = _drop_repeated_tail(_clean(row[field]))

    # Assessment rows are keyed by sub-strand ("1.1 Self-Awareness"), not by
    # strand, and one cell can name two ("3.6 Do not revenge 3.7 Helping ...").
    for kind, _page, _roles, rows, _header in tables:
        if kind != "assessment":
            continue
        for r in rows:
            if len(r) < 4:
                continue
            lead, (methods, resources, non_formal) = " ".join(r[:-3]), r[-3:]
            for m in SUB_STRAND_NUMBER.finditer(lead):
                row = by_number.get(f"{m.group(1)}.{m.group(2)}")
                if row and not row["assessment_methods"]:
                    row["assessment_methods"] = methods
                    row["learning_resources"] = resources
                    row["non_formal_activities"] = non_formal

    rubrics = []
    for kind, page, _roles, rows, header in tables:
        if kind != "rubric":
            continue
        lines = [" | ".join(r) for r in rows if any(r)]
        if header is None and rubrics:  # spill-over rows of the previous rubric
            rubrics[-1] = (rubrics[-1][0], "\n".join([rubrics[-1][1], *lines]))
        else:
            rubrics.append((page, "\n".join([" | ".join(header or []), *lines]).strip()))
    attach_rubrics(rows_out, rubrics)

    for row in rows_out:
        del row["sub_strand_number"]
    return rows_out


def build_chunks(grade: str, subject: str, source_file: str, curriculum_rows: list[dict]) -> list[dict]:
    chunks = []
    for row in curriculum_rows:
        chunk_id = re.sub(
            r"[^a-z0-9]+", "_",
            f"{grade}_{subject}_{row['strand']}_{row['sub_strand']}".lower()
        ).strip("_")

        text_parts = [
            f"Grade: {grade}",
            f"Subject: {subject}",
            f"Strand: {row['strand']}",
            f"Sub-strand: {row['sub_strand']}",
            f"Specific Learning Outcomes: {row['specific_learning_outcomes']}",
            f"Suggested Learning Experiences: {row['suggested_learning_experiences']}",
            f"Key Inquiry Question: {row['key_inquiry_question']}",
        ]
        if row["assessment_methods"]:
            text_parts.append(f"Suggested Assessment Methods: {row['assessment_methods']}")
        if row["learning_resources"]:
            text_parts.append(f"Suggested Learning Resources: {row['learning_resources']}")
        if row["non_formal_activities"]:
            text_parts.append(f"Suggested Non-formal Activities: {row['non_formal_activities']}")
        if row["rubric_text"]:
            text_parts.append(f"Assessment Rubric:\n{row['rubric_text']}")

        chunks.append({
            "id": chunk_id,
            "text": "\n".join(text_parts),
            "metadata": {
                "grade": grade,
                "subject": subject,
                "strand": row["strand"],
                "sub_strand": row["sub_strand"],
                "num_lessons": row["num_lessons"],
                "source_page": row["page_no"],
                "source_file": source_file,
                "has_rubric": bool(row["rubric_text"]),
                "has_assessment_info": bool(row["assessment_methods"]),
                # Known gap -- see module docstring. Left empty rather than guessed.
                "pcis": "",
                "core_competencies": "",
            }
        })
    return chunks


def main():
    aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    aws_region = os.environ.get("AWS_REGION", "us-east-1")

    if aws_access_key or os.environ.get("AWS_PROFILE") or os.environ.get("AWS_DEFAULT_REGION"):
        print(f"Using AWS Bedrock embedding function (Region: {aws_region})")
        ef = BedrockEmbeddingFunction(region_name=aws_region)
    elif gemini_key:
        print("Using Google Gemini embedding function")
        ef = GeminiEmbeddingFunction(api_key=gemini_key)
    else:
        print("Using AWS Bedrock embedding function (Default boto3 credential chain)")
        ef = BedrockEmbeddingFunction(region_name=aws_region)

    if not DOCLING_JSON_DIR.exists():
        print(f"'{DOCLING_JSON_DIR}' not found. Put your Docling JSON exports there.")
        sys.exit(1)

    json_files = sorted(DOCLING_JSON_DIR.glob("*.json"))
    if not json_files:
        print(f"No JSON files found in '{DOCLING_JSON_DIR}'.")
        sys.exit(0)

    all_chunks = []
    for jf in json_files:
        with open(jf, encoding="utf-8") as f:
            doc_dict = json.load(f)

        grade, raw_subject = extract_grade_subject(doc_dict, jf.name)
        subject = canonical_subject(raw_subject)

        curriculum_rows = parse_curriculum_tables(doc_dict)
        if curriculum_rows:
            assessment_by_strand = parse_assessment_tables(doc_dict)
            rubrics = parse_rubric_tables_in_order(doc_dict)
            attach_assessment(curriculum_rows, assessment_by_strand)
            attach_rubrics(curriculum_rows, rubrics)
            parser = "strict"
        else:
            curriculum_rows = parse_document_lenient(doc_dict)
            parser = "lenient"

        chunks = build_chunks(grade, subject, jf.name, curriculum_rows)
        print(f"{jf.name}: {grade} / {subject} -> {len(chunks)} sub-strand chunk(s) "
              f"[{parser} parser], "
              f"{sum(1 for r in curriculum_rows if r['rubric_text'])} with a rubric, "
              f"{sum(1 for r in curriculum_rows if r['assessment_methods'])} with assessment info")

        if not chunks:
            print(f"  !! No curriculum tables matched in {jf.name}. "
                  f"Run inspect_json.py on this specific file -- its table headers "
                  f"may be phrased differently than the sample this script was built from.")

        all_chunks.extend(chunks)

    if not all_chunks:
        print("\nNo chunks produced across any file. Nothing to ingest.")
        sys.exit(1)

    print(f"\nTotal chunks to ingest: {len(all_chunks)}")
    if "--dry-run" in sys.argv:
        print("Dry run: nothing written.")
        return

    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=ef,
    )


    # Embedding costs quota, so skip chunks already stored with identical text
    # and metadata -- a re-run (or a resumed one) only embeds what changed.
    by_id = {c["id"]: c for c in all_chunks}
    stored = collection.get(ids=list(by_id), include=["documents", "metadatas"])
    unchanged = {i for i, doc, meta in zip(stored["ids"], stored["documents"], stored["metadatas"])
                 if by_id[i]["text"] == doc and by_id[i]["metadata"] == meta}
    to_write = [c for c in all_chunks if c["id"] not in unchanged]
    print(f"  {len(unchanged)} chunk(s) already stored unchanged, {len(to_write)} to embed")

    batch_size = 20
    for i in range(0, len(to_write), batch_size):
        batch = to_write[i:i + batch_size]
        for attempt in range(6):
            try:
                collection.upsert(
                    ids=[c["id"] for c in batch],
                    documents=[c["text"] for c in batch],
                    metadatas=[c["metadata"] for c in batch],
                )
                break
            except Exception as exc:
                # Per-minute embedding quota: wait it out rather than abort.
                if "429" not in str(exc) or attempt == 5:
                    raise
                print(f"  Rate limited; waiting 60s (retry {attempt + 1}/5)")
                time.sleep(60)
        print(f"  Upserted {i + len(batch)}/{len(to_write)}")

        time.sleep(0.5)

    # Re-ingesting a file replaces its chunks. Chunk ids embed the subject and
    # sub-strand text, so any id this run no longer produces for a source file
    # (a renamed subject, a re-parsed sub-strand) would otherwise linger as a
    # duplicate alongside its replacement. Done only after every upsert has
    # succeeded, so a failed run never leaves the store with less than before.
    new_ids = {c["id"] for c in all_chunks}
    for jf in json_files:
        existing = collection.get(where={"source_file": jf.name}, include=[])["ids"]
        stale = [i for i in existing if i not in new_ids]
        if stale:
            collection.delete(ids=stale)
            print(f"  Removed {len(stale)} stale chunk(s) from {jf.name}")

    print(f"\nDone. Collection '{COLLECTION_NAME}' now has {collection.count()} chunk(s) "
          f"stored at {CHROMA_DB_PATH}")


if __name__ == "__main__":
    main()