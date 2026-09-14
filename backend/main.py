"""CBC Teacher Agent API: curriculum search (ChromaDB), schemes of work (Postgres)
and grounded term-plan generation (Gemini).

Run from the PROJECT ROOT (cbc-agent/), not from inside backend/:
    python -m uvicorn backend.main:app --reload --port 8000
"""
import logging
import math
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import date
from typing import Any, Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg2 import errors as pg_errors
from psycopg2.extras import Json
from pydantic import BaseModel

from backend.chroma import SEMANTIC_AVAILABLE, collection
from backend.db import connection as db
from backend.parsing import UNSUPPORTED_CATEGORIES, chunk_to_evidence_items

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="CBC Teacher Agent API", lifespan=lifespan)

# Allow the Next.js frontend (port 3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    grade: str
    subject: str
    strand: Optional[str] = None
    sub_strand: Optional[str] = None
    content_type: Optional[str] = None
    query: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok", "chroma_chunk_count": collection.count()}


@app.get("/api/curriculum/options")
def curriculum_options():
    """The grade/subject/strand/sub-strand values that ACTUALLY exist in the
    collection, so the frontend dropdowns can only offer searchable combinations."""
    data = collection.get(include=["metadatas"])

    grades, subjects = set(), set()
    strands_by_subject = defaultdict(set)
    sub_strands_by_strand = defaultdict(set)
    # Grade-scoped variants. The two maps above are subject-keyed only, so on their
    # own they offer (say) a Grade 4 sub-strand under Grade 5 -- a combination with
    # no data behind it. These extra maps let the UI offer only real combinations;
    # the documented keys are still returned unchanged for compatibility.
    strands_by_grade_subject = defaultdict(set)
    sub_strands_by_grade_subject_strand = defaultdict(set)

    for m in data["metadatas"]:
        grade, subject = m.get("grade"), m.get("subject")
        strand, sub_strand = m.get("strand"), m.get("sub_strand")
        if grade:
            grades.add(grade)
        if subject:
            subjects.add(subject)
        if subject and strand:
            strands_by_subject[subject].add(strand)
        if strand and sub_strand:
            sub_strands_by_strand[strand].add(sub_strand)
        if grade and subject and strand:
            strands_by_grade_subject[f"{grade}|{subject}"].add(strand)
            if sub_strand:
                sub_strands_by_grade_subject_strand[f"{grade}|{subject}|{strand}"].add(sub_strand)

    def render(mapping):
        return {k: sorted(v) for k, v in sorted(mapping.items())}

    return {
        "grades": sorted(grades),
        "subjects": sorted(subjects),
        "strandsBySubject": render(strands_by_subject),
        "subStrandsByStrand": render(sub_strands_by_strand),
        "strandsByGradeSubject": render(strands_by_grade_subject),
        "subStrandsByGradeSubjectStrand": render(sub_strands_by_grade_subject_strand),
    }


def _build_where(req: SearchRequest) -> dict:
    clauses = [{"grade": req.grade}, {"subject": req.subject}]
    if req.strand:
        clauses.append({"strand": req.strand})
    if req.sub_strand:
        clauses.append({"sub_strand": req.sub_strand})
    return clauses[0] if len(clauses) == 1 else {"$and": clauses}


@app.post("/api/curriculum/search")
def search_curriculum(req: SearchRequest):
    # These three are never present in ingested chunks (see backend/parsing.py),
    # so filtering to one of them can only ever be empty -- short-circuit before
    # spending a Chroma call on it.
    if req.content_type in UNSUPPORTED_CATEGORIES:
        return {"results": [], "total": 0}

    where = _build_where(req)
    # A query we cannot embed degrades to filter-only browsing rather than failing,
    # but the caller is told so it never mistakes filtered results for ranked ones.
    degraded = bool(req.query) and not SEMANTIC_AVAILABLE
    if degraded:
        logging.warning("query %r ignored: GEMINI_API_KEY unset, filter-only results", req.query)

    try:
        if req.query and SEMANTIC_AVAILABLE:
            # Semantic search within the filtered set.
            res = collection.query(query_texts=[req.query], where=where, n_results=20)
            documents = res["documents"][0] if res["documents"] else []
            metadatas = res["metadatas"][0] if res["metadatas"] else []
        else:
            # Pure metadata filter browsing -- no embedding call needed.
            res = collection.get(where=where, include=["documents", "metadatas"])
            documents = res["documents"] or []
            metadatas = res["metadatas"] or []
    except Exception as exc:
        logging.exception("curriculum search failed for %s", req.model_dump())
        if req.query and SEMANTIC_AVAILABLE:
            # A failed embedding call (network, bad key, quota) is not "no matches" --
            # reporting it as an empty result would hide the outage from the teacher.
            raise HTTPException(status_code=502, detail=f"Semantic search failed: {exc}") from exc
        # An unmatched filter must read as "no results", never as a server error.
        return {"results": [], "total": 0}

    items = []
    for document, metadata in zip(documents, metadatas):
        items.extend(chunk_to_evidence_items(document, metadata))

    if req.content_type:
        items = [i for i in items if i["category"] == req.content_type]

    response = {"results": items, "total": len(items)}
    if degraded:
        response["semanticUnavailable"] = True
    return response


# ---------------------------------------------------------------------------
# Schemes of work (Postgres)
# ---------------------------------------------------------------------------

class SchemeContent(BaseModel):
    # TermPlanRow objects are stored exactly as the frontend sends them.
    rows: list[dict[str, Any]]


class SchemeCreate(BaseModel):
    grade: str
    subject: str
    term: int
    year: int
    content: SchemeContent


class SchemeUpdate(BaseModel):
    content: SchemeContent


def _require_db():
    if not db.is_available():
        raise HTTPException(
            status_code=503,
            detail="Scheme storage is unavailable: Postgres is not configured or unreachable (check DATABASE_URL).",
        )


@app.post("/api/schemes")
def create_scheme(body: SchemeCreate):
    _require_db()
    with db.get_cursor() as cur:
        cur.execute(
            """INSERT INTO schemes_of_work (user_id, grade, subject, term, year, content, status)
               VALUES (%s, %s, %s, %s, %s, %s, 'draft') RETURNING *""",
            (db.demo_user_id, body.grade, body.subject, body.term, body.year,
             Json(body.content.model_dump())),
        )
        return cur.fetchone()


@app.patch("/api/schemes/{scheme_id}")
def update_scheme(scheme_id: UUID, body: SchemeUpdate):
    _require_db()
    with db.get_cursor() as cur:
        cur.execute(
            "UPDATE schemes_of_work SET content = %s WHERE id = %s RETURNING *",
            (Json(body.content.model_dump()), str(scheme_id)),
        )
        row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return row


@app.get("/api/schemes/{scheme_id}")
def get_scheme(scheme_id: UUID):
    _require_db()
    with db.get_cursor() as cur:
        cur.execute("SELECT * FROM schemes_of_work WHERE id = %s", (str(scheme_id),))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return row


@app.post("/api/schemes/{scheme_id}/confirm")
def confirm_scheme(scheme_id: UUID):
    _require_db()
    with db.get_cursor() as cur:
        cur.execute(
            "UPDATE schemes_of_work SET status = 'confirmed' WHERE id = %s RETURNING *",
            (str(scheme_id),),
        )
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Scheme not found")
        cur.execute(
            """INSERT INTO confirmation_logs (entity_type, entity_id, user_id, action)
               VALUES ('scheme', %s, %s, 'confirmed')""",
            (str(scheme_id), db.demo_user_id),
        )
    return row


# ---------------------------------------------------------------------------
# Daily lesson plans (Postgres)
# ---------------------------------------------------------------------------

class LessonCreate(BaseModel):
    scheme_id: Optional[UUID] = None
    lesson_date: date
    strand: str
    sub_strand: str
    # The LessonPlanDraft object, stored exactly as the frontend sends it.
    content: dict[str, Any]


class LessonUpdate(BaseModel):
    content: dict[str, Any]
    # Optional so the lesson_date column follows the draft's date instead of going stale.
    lesson_date: Optional[date] = None


@app.post("/api/lessons")
def create_lesson(body: LessonCreate):
    _require_db()
    try:
        with db.get_cursor() as cur:
            # learning_outcomes/activities are NOT NULL legacy columns; content is the record.
            cur.execute(
                """INSERT INTO lesson_plans (scheme_id, user_id, lesson_date, strand, sub_strand,
                                             learning_outcomes, activities, content, status)
                   VALUES (%s, %s, %s, %s, %s, '{}', '{}', %s, 'draft') RETURNING *""",
                (str(body.scheme_id) if body.scheme_id else None, db.demo_user_id, body.lesson_date,
                 body.strand, body.sub_strand, Json(body.content)),
            )
            return cur.fetchone()
    except pg_errors.ForeignKeyViolation as exc:
        raise HTTPException(status_code=400, detail="The term plan this lesson belongs to was not found.") from exc


@app.patch("/api/lessons/{lesson_id}")
def update_lesson(lesson_id: UUID, body: LessonUpdate):
    _require_db()
    with db.get_cursor() as cur:
        cur.execute(
            """UPDATE lesson_plans SET content = %s, lesson_date = COALESCE(%s, lesson_date)
               WHERE id = %s RETURNING *""",
            (Json(body.content), body.lesson_date, str(lesson_id)),
        )
        row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    return row


@app.get("/api/lessons/{lesson_id}")
def get_lesson(lesson_id: UUID):
    _require_db()
    with db.get_cursor() as cur:
        cur.execute("SELECT * FROM lesson_plans WHERE id = %s", (str(lesson_id),))
        row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    return row


@app.post("/api/lessons/{lesson_id}/confirm")
def confirm_lesson(lesson_id: UUID):
    _require_db()
    with db.get_cursor() as cur:
        cur.execute(
            "UPDATE lesson_plans SET status = 'confirmed' WHERE id = %s RETURNING *",
            (str(lesson_id),),
        )
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Lesson plan not found")
        cur.execute(
            """INSERT INTO confirmation_logs (entity_type, entity_id, user_id, action)
               VALUES ('lesson_plan', %s, %s, 'confirmed')""",
            (str(lesson_id), db.demo_user_id),
        )
    return row


# ---------------------------------------------------------------------------
# Grounded daily-lesson generation
# ---------------------------------------------------------------------------

class GenerateLessonRequest(BaseModel):
    grade: str
    subject: str
    strand: str
    subStrand: str
    lessons: str = ""
    keyInquiryQuestion: str = ""
    outcomes: str = ""
    experiences: str = ""
    resources: str = ""
    assessment: str = ""


@app.post("/api/generate/lesson-plan")
def generate_lesson_plan_from_row(req: GenerateLessonRequest):
    row = req.model_dump(include={"keyInquiryQuestion", "outcomes", "experiences", "resources", "assessment"})
    if not any(value.strip() for value in row.values()):
        raise HTTPException(status_code=400, detail="The selected term plan row has no content to plan from.")

    try:
        from agent import generate_daily_lesson_content
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Generation is unavailable: {exc}") from exc

    try:
        generated = generate_daily_lesson_content(
            req.grade, req.subject, req.strand, req.subStrand, req.lessons, row
        )
    except Exception as exc:
        logging.exception("lesson generation failed for %s / %s", req.strand, req.subStrand)
        raise HTTPException(status_code=502, detail=f"Lesson plan generation failed: {exc}") from exc

    # The row's own fields are already grounded, so they pass straight through.
    return {
        "keyInquiryQuestion": req.keyInquiryQuestion,
        "outcomes": req.outcomes,
        "resources": req.resources,
        **generated,
    }


# ---------------------------------------------------------------------------
# Grounded term-plan generation
# ---------------------------------------------------------------------------

LESSONS_PER_WEEK = 3


class EvidenceIn(BaseModel):
    id: str
    category: str
    grade: str
    subject: str
    strand: str
    subStrand: str
    content: str


class GenerateTermPlanRequest(BaseModel):
    evidence: list[EvidenceIn]
    grade: str
    subject: str


def _num_lessons(grade: str, subject: str, strand: str, sub_strand: str) -> int:
    """The sub-strand's real lesson allocation, or one week's worth if unknown."""
    try:
        res = collection.get(
            where={"$and": [{"grade": grade}, {"subject": subject},
                            {"strand": strand}, {"sub_strand": sub_strand}]},
            include=["metadatas"],
        )
        value = int(str(res["metadatas"][0].get("num_lessons", "")).strip())
        return value if value > 0 else LESSONS_PER_WEEK
    except Exception:
        return LESSONS_PER_WEEK


def _lesson_ranges(num_lessons: int) -> list[str]:
    ranges = []
    for week in range(math.ceil(num_lessons / LESSONS_PER_WEEK)):
        start = week * LESSONS_PER_WEEK + 1
        end = min(start + LESSONS_PER_WEEK - 1, num_lessons)
        ranges.append(str(start) if start == end else f"{start}-{end}")
    return ranges


@app.post("/api/generate/term-plan-rows")
def generate_term_plan_rows(req: GenerateTermPlanRequest):
    if not req.evidence:
        raise HTTPException(status_code=400, detail="No evidence supplied")

    try:
        # Imported lazily: agent.py raises at import time without GEMINI_API_KEY,
        # which must not take down the curriculum endpoints.
        from agent import generate_term_plan_content
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Generation is unavailable: {exc}") from exc

    groups: dict[tuple[str, str], list[EvidenceIn]] = defaultdict(list)
    for item in req.evidence:
        groups[(item.strand, item.subStrand)].append(item)

    rows = []
    for (strand, sub_strand), items in groups.items():
        # Evidence carries the exact Chroma metadata it came from; fall back to the
        # request's teaching context only if an item lacks it.
        grade = items[0].grade or req.grade
        subject = items[0].subject or req.subject

        evidence_by_category: dict[str, str] = defaultdict(str)
        for item in items:
            evidence_by_category[item.category] = "\n".join(
                part for part in (evidence_by_category[item.category], item.content) if part
            )

        try:
            content = generate_term_plan_content(grade, subject, strand, sub_strand, dict(evidence_by_category))
        except Exception as exc:
            logging.exception("term-plan generation failed for %s / %s", strand, sub_strand)
            raise HTTPException(status_code=502, detail=f"Term plan generation failed: {exc}") from exc

        for lessons in _lesson_ranges(_num_lessons(grade, subject, strand, sub_strand)):
            rows.append({
                "strand": strand,
                "subStrand": sub_strand,
                **content,
                "evidenceIds": [item.id for item in items],
                "lessons": lessons,
            })

    return {"rows": rows}
