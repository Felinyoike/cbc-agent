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
from typing import Any, Literal, Optional
from uuid import UUID

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from psycopg2 import errors as pg_errors
from psycopg2.extras import Json
from pydantic import BaseModel, Field

from backend.chroma import collection
from backend.db import connection as db
from backend.documents import DOCX_MEDIA_TYPE, generate_lesson_docx, generate_scheme_docx, safe_filename
from backend.search import SearchFailed, search_evidence

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


@app.post("/api/curriculum/search")
def search_curriculum(req: SearchRequest):
    try:
        return search_evidence(req.grade, req.subject, req.strand, req.sub_strand, req.content_type, req.query)
    except SearchFailed as exc:
        # A failed embedding call (network, bad key, quota) is not "no matches" --
        # reporting it as an empty result would hide the outage from the teacher.
        raise HTTPException(status_code=502, detail=f"Semantic search failed: {exc}") from exc


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
            """UPDATE lesson_plans SET content = %s, lesson_date = COALESCE(%s, lesson_date),
                                       updated_at = CURRENT_TIMESTAMP
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
            "UPDATE lesson_plans SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *",
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
# Word downloads and the library of confirmed work (Postgres)
# ---------------------------------------------------------------------------

def _fetch_one(sql: str, params: tuple):
    with db.get_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def _docx_response(content: bytes, filename: str) -> Response:
    return Response(content=content, media_type=DOCX_MEDIA_TYPE,
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@app.get("/api/schemes/{scheme_id}/download")
def download_scheme(scheme_id: UUID):
    _require_db()
    scheme = _fetch_one("SELECT * FROM schemes_of_work WHERE id = %s", (str(scheme_id),))
    if scheme is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    filename = safe_filename("Scheme_of_Work", scheme["subject"], scheme["grade"],
                             f"Term_{scheme['term']}", scheme["year"])
    return _docx_response(generate_scheme_docx(scheme), filename)


@app.get("/api/lessons/{lesson_id}/download")
def download_lesson(lesson_id: UUID):
    _require_db()
    lesson = _fetch_one("SELECT * FROM lesson_plans WHERE id = %s", (str(lesson_id),))
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson plan not found")
    # An unlinked lesson is valid: the document just has no grade/subject/term context.
    scheme = (_fetch_one("SELECT * FROM schemes_of_work WHERE id = %s", (str(lesson["scheme_id"]),))
              if lesson["scheme_id"] else None)
    # Same date the document header shows: the draft's own date, falling back to the column.
    lesson_date = (lesson["content"] or {}).get("date") or lesson["lesson_date"]
    filename = safe_filename("Lesson_Plan", lesson["sub_strand"], lesson_date)
    return _docx_response(generate_lesson_docx(lesson, scheme), filename)


@app.get("/api/library")
def library():
    """Confirmed schemes and lesson plans only, most recently updated first."""
    _require_db()
    with db.get_cursor() as cur:
        cur.execute(
            """SELECT id, grade, subject, term, year, updated_at, content
               FROM schemes_of_work WHERE status = 'confirmed'"""
        )
        schemes = cur.fetchall()
        cur.execute(
            """SELECT l.id, l.sub_strand, l.updated_at, l.content,
                      s.grade, s.subject, s.term, s.year
               FROM lesson_plans l LEFT JOIN schemes_of_work s ON s.id = l.scheme_id
               WHERE l.status = 'confirmed'"""
        )
        lessons = cur.fetchall()

    items = []
    for scheme in schemes:
        rows = (scheme["content"] or {}).get("rows") or []
        items.append({
            "id": str(scheme["id"]),
            "type": "Scheme of Work",
            "title": f"{scheme['subject']} scheme of work",
            "grade": scheme["grade"],
            "subject": scheme["subject"],
            "term": scheme["term"],
            "year": scheme["year"],
            "updatedAt": scheme["updated_at"],
            "evidenceCount": len({eid for row in rows for eid in row.get("evidenceIds") or []}),
        })
    for lesson in lessons:
        items.append({
            "id": str(lesson["id"]),
            "type": "Lesson Plan",
            "title": ((lesson["content"] or {}).get("title") or "").strip() or lesson["sub_strand"],
            # Null when the lesson was never linked to a saved scheme.
            "grade": lesson["grade"],
            "subject": lesson["subject"],
            "term": lesson["term"],
            "year": lesson["year"],
            "updatedAt": lesson["updated_at"],
            # LessonPlanDraft carries no evidence ids, so no count is reported.
            "evidenceCount": None,
        })

    items.sort(key=lambda item: item["updatedAt"], reverse=True)
    return {"items": items}


# ---------------------------------------------------------------------------
# Post-lesson reflections (Postgres), attached to confirmed lesson plans
# ---------------------------------------------------------------------------

EVIDENCE_FIELDS = ("learnerActions", "workEvidence", "needSupport", "difficulties", "revisit")
OUTCOME_STATUSES = ("achieved", "partially-achieved", "not-yet-achieved", "insufficient-evidence")


class ReflectionEvidence(BaseModel):
    learnerActions: str = ""
    workEvidence: str = ""
    needSupport: str = ""
    difficulties: str = ""
    revisit: str = ""


class ReflectionContent(BaseModel):
    evidence: ReflectionEvidence = Field(default_factory=ReflectionEvidence)
    outcomeStatus: Optional[Literal["achieved", "partially-achieved", "not-yet-achieved", "insufficient-evidence"]] = None


class ReflectionCreate(BaseModel):
    lesson_id: UUID
    content: ReflectionContent
    # Omitted means "no summary generated yet"; a PATCH without it keeps the stored one.
    agent_summary: Optional[str] = None


class ReflectionUpdate(BaseModel):
    content: ReflectionContent
    agent_summary: Optional[str] = None


def _lesson_title(lesson_content: Optional[dict], sub_strand: str) -> str:
    return ((lesson_content or {}).get("title") or "").strip() or sub_strand


def _lesson_date(lesson_content: Optional[dict], lesson_date) -> str:
    # The draft's own date is what the teacher sees; the column is the fallback.
    return (lesson_content or {}).get("date") or (lesson_date.isoformat() if lesson_date else "")


def _reflection_out(row: dict) -> dict:
    content = row.get("content") or {}
    return {
        "id": str(row["id"]),
        "lessonId": str(row["lesson_id"]),
        "status": row["status"],
        "evidence": {field: (content.get("evidence") or {}).get(field, "") for field in EVIDENCE_FIELDS},
        "outcomeStatus": content.get("outcomeStatus"),
        "agentSummary": row.get("agent_summary"),
        "updatedAt": row.get("updated_at"),
    }


@app.get("/api/reflections")
def list_reflections():
    """Every confirmed lesson plan with its reflection, if any, most recent lesson first."""
    _require_db()
    with db.get_cursor() as cur:
        cur.execute(
            """SELECT l.id AS lesson_id, l.lesson_date, l.strand, l.sub_strand, l.content AS lesson_content,
                      s.grade, s.subject,
                      e.id AS reflection_id, e.status AS reflection_status,
                      e.content AS reflection_content, e.agent_summary
               FROM lesson_plans l
               LEFT JOIN schemes_of_work s ON s.id = l.scheme_id
               LEFT JOIN LATERAL (
                   SELECT * FROM evaluation_records r WHERE r.lesson_id = l.id
                   ORDER BY r.created_at DESC LIMIT 1
               ) e ON TRUE
               WHERE l.status = 'confirmed'"""
        )
        rows = cur.fetchall()

    items = []
    for row in rows:
        reflection = row["reflection_content"] or {}
        has_record = row["reflection_id"] is not None
        items.append({
            "lessonId": str(row["lesson_id"]),
            "lessonTitle": _lesson_title(row["lesson_content"], row["sub_strand"]),
            "lessonDate": _lesson_date(row["lesson_content"], row["lesson_date"]),
            "strand": row["strand"],
            "subStrand": row["sub_strand"],
            # Null when the lesson was never linked to a saved scheme.
            "grade": row["grade"],
            "subject": row["subject"],
            "reflectionId": str(row["reflection_id"]) if has_record else None,
            "status": row["reflection_status"] if has_record else "not_started",
            "evidence": ({field: (reflection.get("evidence") or {}).get(field, "") for field in EVIDENCE_FIELDS}
                         if has_record else None),
            "outcomeStatus": reflection.get("outcomeStatus") if has_record else None,
            "agentSummary": row["agent_summary"] if has_record else None,
        })

    items.sort(key=lambda item: item["lessonDate"], reverse=True)
    return {"items": items}


@app.get("/api/reflections/by-lesson/{lesson_id}")
def get_reflection_for_lesson(lesson_id: UUID):
    """`{"reflection": null}` when none exists yet: "not started" is a normal state, not an error."""
    _require_db()
    with db.get_cursor() as cur:
        cur.execute(
            "SELECT * FROM evaluation_records WHERE lesson_id = %s ORDER BY created_at DESC LIMIT 1",
            (str(lesson_id),),
        )
        row = cur.fetchone()
    return {"reflection": _reflection_out(row) if row else None}


@app.post("/api/reflections")
def create_reflection(body: ReflectionCreate):
    _require_db()
    with db.get_cursor() as cur:
        cur.execute("SELECT status FROM lesson_plans WHERE id = %s", (str(body.lesson_id),))
        lesson = cur.fetchone()
        if lesson is None:
            raise HTTPException(status_code=404, detail="Lesson plan not found")
        if lesson["status"] != "confirmed":
            raise HTTPException(status_code=400, detail="Only a confirmed lesson plan can be reflected on.")
        cur.execute("SELECT id FROM evaluation_records WHERE lesson_id = %s", (str(body.lesson_id),))
        if cur.fetchone() is not None:
            raise HTTPException(status_code=409, detail="This lesson already has a reflection record.")
        cur.execute(
            """INSERT INTO evaluation_records (lesson_id, user_id, content, agent_summary, status)
               VALUES (%s, %s, %s, %s, 'draft') RETURNING *""",
            (str(body.lesson_id), db.demo_user_id, Json(body.content.model_dump()), body.agent_summary),
        )
        return _reflection_out(cur.fetchone())


@app.patch("/api/reflections/{reflection_id}")
def update_reflection(reflection_id: UUID, body: ReflectionUpdate):
    _require_db()
    with db.get_cursor() as cur:
        cur.execute("SELECT status FROM evaluation_records WHERE id = %s", (str(reflection_id),))
        existing = cur.fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail="Reflection not found")
        if existing["status"] == "confirmed":
            raise HTTPException(status_code=409, detail="A confirmed reflection record can no longer be edited.")
        cur.execute(
            """UPDATE evaluation_records
               SET content = %s, agent_summary = COALESCE(%s, agent_summary), updated_at = CURRENT_TIMESTAMP
               WHERE id = %s RETURNING *""",
            (Json(body.content.model_dump()), body.agent_summary, str(reflection_id)),
        )
        return _reflection_out(cur.fetchone())


@app.post("/api/reflections/{reflection_id}/confirm")
def confirm_reflection(reflection_id: UUID):
    _require_db()
    with db.get_cursor() as cur:
        cur.execute("SELECT * FROM evaluation_records WHERE id = %s FOR UPDATE", (str(reflection_id),))
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Reflection not found")
        if row["status"] == "confirmed":
            raise HTTPException(status_code=409, detail="This reflection record is already confirmed.")

        # Validated here, not only in the UI: a record is never confirmed without the
        # teacher's own evidence and an outcome status the teacher chose.
        content = row["content"] or {}
        evidence = content.get("evidence") or {}
        if not any(str(evidence.get(field) or "").strip() for field in EVIDENCE_FIELDS):
            raise HTTPException(status_code=400,
                                detail="Record at least one piece of post-lesson evidence before confirming.")
        outcome_status = content.get("outcomeStatus")
        if outcome_status not in OUTCOME_STATUSES:
            raise HTTPException(status_code=400,
                                detail="Choose an outcome status based on your evidence before confirming.")

        cur.execute(
            """UPDATE evaluation_records
               SET status = 'confirmed', achievement_status = %s, updated_at = CURRENT_TIMESTAMP
               WHERE id = %s RETURNING *""",
            (outcome_status, str(reflection_id)),
        )
        confirmed = cur.fetchone()
        cur.execute(
            """INSERT INTO confirmation_logs (entity_type, entity_id, user_id, action)
               VALUES ('evaluation', %s, %s, 'confirmed')""",
            (str(reflection_id), db.demo_user_id),
        )
    return _reflection_out(confirmed)


class ReflectionSummaryRequest(BaseModel):
    evidence: ReflectionEvidence


@app.post("/api/generate/reflection-summary")
def generate_reflection_summary_from_evidence(req: ReflectionSummaryRequest):
    evidence = req.evidence.model_dump()
    if not any(value.strip() for value in evidence.values()):
        raise HTTPException(status_code=400, detail="Record some post-lesson evidence before generating a summary.")

    try:
        from agent import generate_reflection_summary
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Generation is unavailable: {exc}") from exc

    try:
        summary = generate_reflection_summary(evidence)
    except Exception as exc:
        logging.exception("reflection summary generation failed")
        raise HTTPException(status_code=502, detail=f"Reflection summary generation failed: {exc}") from exc
    return {"summary": summary}


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


# ---------------------------------------------------------------------------
# Planning assistant (conversational, advisory only)
# ---------------------------------------------------------------------------

class AssistantAskRequest(BaseModel):
    prompt: str
    grade: str
    subject: str
    # May be empty: not every question needs curriculum grounding.
    evidence: list[EvidenceIn] = []


@app.post("/api/assistant/ask")
def assistant_ask(req: AssistantAskRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Ask the assistant a question first.")

    try:
        # Imported lazily for the same reason as agent.py: it requires GEMINI_API_KEY.
        from backend.assistant import ask_assistant
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"The assistant is unavailable: {exc}") from exc

    try:
        reply = ask_assistant(req.prompt, req.grade, req.subject, [item.model_dump() for item in req.evidence])
    except Exception as exc:
        logging.exception("assistant request failed")
        raise HTTPException(status_code=502, detail=f"The assistant could not answer: {exc}") from exc

    if not reply["answer"]:
        raise HTTPException(status_code=502, detail="The assistant returned an empty answer.")
    return {"answer": reply["answer"]}


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
