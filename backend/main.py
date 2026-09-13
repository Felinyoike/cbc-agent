"""Curriculum search API over the ingested KICD ChromaDB collection.

Scope is deliberately narrow: browse/search curriculum evidence, nothing else.
No Postgres, no scheme/lesson endpoints, no generation.

Run from the PROJECT ROOT (cbc-agent/), not from inside backend/:
    python -m uvicorn backend.main:app --reload --port 8000
"""
import logging
from collections import defaultdict
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.chroma import SEMANTIC_AVAILABLE, collection
from backend.parsing import UNSUPPORTED_CATEGORIES, chunk_to_evidence_items

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="CBC Teacher Agent API")

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
