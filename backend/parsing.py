"""Split an ingested chunk's text into the per-category EvidenceItems the frontend renders.

Chunk text is produced by ingest.py's build_chunks(), so the labels below are
exact -- match them literally at line start, never fuzzily.

Deliberately NOT produced here: Core Competencies, Values, and Pertinent and
Contemporary Issues. ingest.py's own docstring documents these as a known gap
(the `pcis` / `core_competencies` metadata fields exist but are always ""), and
inventing placeholder text for them would violate this project's evidence-first
grounding rule. They are omitted entirely rather than faked.
"""
import hashlib

# Exact labels emitted by ingest.py's build_chunks(), longest-first so that
# "Sub-strand:" is never shadowed by "Strand:".
LABELS = [
    "Specific Learning Outcomes:",
    "Suggested Learning Experiences:",
    "Key Inquiry Question:",
    "Suggested Assessment Methods:",
    "Suggested Learning Resources:",
    "Suggested Non-formal Activities:",
    "Assessment Rubric:",
    "Sub-strand:",
    "Subject:",
    "Theme:",
    "Strand:",
    "Grade:",
]

# Categories that exist in the frontend but are never present in ingested chunks.
UNSUPPORTED_CATEGORIES = {
    "Core Competencies",
    "Values",
    "Pertinent and Contemporary Issues",
}


def split_sections(text: str) -> dict[str, str]:
    """Map each exact label -> its text body. Bodies may span multiple lines
    (the Assessment Rubric always does)."""
    sections: dict[str, list[str]] = {}
    current: str | None = None

    for line in text.splitlines():
        for label in LABELS:
            if line.startswith(label):
                current = label
                sections.setdefault(current, []).append(line[len(label):].strip())
                break
        else:
            if current is not None:
                sections[current].append(line)

    return {label: "\n".join(parts).strip() for label, parts in sections.items()}


def _item_id(grade: str, subject: str, strand: str, sub_strand: str, category: str) -> str:
    """Stable across requests -- the frontend tracks selected evidence by id."""
    key = f"{grade}|{subject}|{strand}|{sub_strand}|{category}"
    return hashlib.sha1(key.encode()).hexdigest()[:12]


def chunk_to_evidence_items(document: str, metadata: dict) -> list[dict]:
    """Split one chunk into one EvidenceItem per present category."""
    sections = split_sections(document)

    grade = metadata.get("grade", "")
    subject = metadata.get("subject", "")
    strand = metadata.get("strand", "")
    sub_strand = metadata.get("sub_strand", "")
    # Known, accepted limitation: source_page is the curriculum table's page, so
    # Assessment items pulled from a separate table type may report that page
    # rather than their own. Not solved in this pass -- just not made worse.
    page = metadata.get("source_page", 0)

    # (category, content, sourceRendering) in the order the frontend expects.
    built: list[tuple[str, str, str]] = []

    if sections.get("Specific Learning Outcomes:"):
        built.append((
            "Specific Learning Outcomes",
            sections["Specific Learning Outcomes:"],
            "reconstructed-table",
        ))

    if sections.get("Suggested Learning Experiences:"):
        built.append((
            "Suggested Learning Experiences",
            sections["Suggested Learning Experiences:"],
            "reconstructed-table",
        ))

    # Singular in the source text, plural as a frontend category.
    if sections.get("Key Inquiry Question:"):
        built.append((
            "Key Inquiry Questions",
            sections["Key Inquiry Question:"],
            "raw-text",
        ))

    # Assessment = methods + rubric merged into a single item.
    methods = sections.get("Suggested Assessment Methods:", "")
    rubric = sections.get("Assessment Rubric:", "")
    if methods or rubric:
        parts = []
        if methods:
            parts.append(methods)
        if rubric:
            parts.append(f"Assessment Rubric:\n{rubric}")
        built.append(("Assessment", "\n\n".join(parts), "reconstructed-table"))

    # Resources = learning resources + non-formal activities merged.
    resources = sections.get("Suggested Learning Resources:", "")
    non_formal = sections.get("Suggested Non-formal Activities:", "")
    if resources or non_formal:
        parts = []
        if resources:
            parts.append(resources)
        if non_formal:
            parts.append(f"Suggested Non-formal Activities: {non_formal}")
        built.append(("Resources", "\n".join(parts), "raw-text"))

    items = []
    for category, content, rendering in built:
        items.append({
            "id": _item_id(grade, subject, strand, sub_strand, category),
            "category": category,
            "grade": grade,
            "subject": subject,
            "strand": strand,
            "subStrand": sub_strand,
            # Only the theme-based language designs (English, Indigenous
            # Languages) have one; omitted rather than empty for the rest.
            **({"theme": metadata["theme"]} if metadata.get("theme") else {}),
            "page": page,
            "designTitle": f"KICD {grade} {subject} Curriculum Design",
            # There is only one extracted representation in the real pipeline --
            # no separate "clean" and "raw" version. Verbatim in both fields.
            "content": content,
            "sourceRendering": rendering,
            "sourceExcerpt": content,
        })
    return items
