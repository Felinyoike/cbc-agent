"""The single implementation of curriculum search, shared by the search endpoint and the
planning assistant's search_curriculum tool."""
import logging
from typing import Optional

from backend.chroma import SEMANTIC_AVAILABLE, collection
from backend.parsing import UNSUPPORTED_CATEGORIES, chunk_to_evidence_items


class SearchFailed(RuntimeError):
    """A semantic query could not be embedded or run (network, bad key, quota)."""


def _build_where(grade: str, subject: str, strand: Optional[str], sub_strand: Optional[str]) -> dict:
    clauses = [{"grade": grade}, {"subject": subject}]
    if strand:
        clauses.append({"strand": strand})
    if sub_strand:
        clauses.append({"sub_strand": sub_strand})
    return clauses[0] if len(clauses) == 1 else {"$and": clauses}


def search_evidence(grade: str, subject: str, strand: Optional[str] = None, sub_strand: Optional[str] = None,
                    content_type: Optional[str] = None, query: Optional[str] = None) -> dict:
    """Returns {"results": [EvidenceItem...], "total": n} plus "semanticUnavailable" when degraded.

    Raises SearchFailed when a semantic query fails, so an outage never reads as "no matches".
    """
    # These three are never present in ingested chunks (see backend/parsing.py),
    # so filtering to one of them can only ever be empty -- short-circuit before
    # spending a Chroma call on it.
    if content_type in UNSUPPORTED_CATEGORIES:
        return {"results": [], "total": 0}

    where = _build_where(grade, subject, strand, sub_strand)
    # A query we cannot embed degrades to filter-only browsing rather than failing,
    # but the caller is told so it never mistakes filtered results for ranked ones.
    degraded = bool(query) and not SEMANTIC_AVAILABLE
    if degraded:
        logging.warning("query %r ignored: GEMINI_API_KEY unset, filter-only results", query)

    try:
        if query and SEMANTIC_AVAILABLE:
            # Semantic search within the filtered set.
            res = collection.query(query_texts=[query], where=where, n_results=20)
            documents = res["documents"][0] if res["documents"] else []
            metadatas = res["metadatas"][0] if res["metadatas"] else []
        else:
            # Pure metadata filter browsing -- no embedding call needed.
            res = collection.get(where=where, include=["documents", "metadatas"])
            documents = res["documents"] or []
            metadatas = res["metadatas"] or []
    except Exception as exc:
        logging.exception("curriculum search failed for %s", where)
        if query and SEMANTIC_AVAILABLE:
            raise SearchFailed(str(exc)) from exc
        # An unmatched filter must read as "no results", never as a server error.
        return {"results": [], "total": 0}

    items = []
    for document, metadata in zip(documents, metadatas):
        items.extend(chunk_to_evidence_items(document, metadata))

    if content_type:
        items = [i for i in items if i["category"] == content_type]

    response = {"results": items, "total": len(items)}
    if degraded:
        response["semanticUnavailable"] = True
    return response
