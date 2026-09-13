This is a three-phase task: (1) fix bad subject metadata already sitting in ChromaDB, (2) build a minimal FastAPI backend that searches it correctly, (3) wire the Next.js frontend's curriculum page to call that backend instead of static mock data. Do these in order — phase 2 depends on phase 1 being done first, and phase 3 depends on phase 2 working.

Nothing outside curriculum search is in scope: no Postgres, no scheme/lesson endpoints, no AI generation, no assistant/explore endpoint. Just search, end to end, on clean data.

## Before you start

- Confirm `GEMINI_API_KEY` is set in `.env`.
- **Path warning:** there is a duplicate, nested `kicd_chroma_db/kicd_chroma_db/` folder on disk — confirmed to be an exact byte-for-byte copy of the real store (same UUID, same file size), left over from an earlier copy mistake. The correct path is the top-level `kicd_chroma_db/` only. Do not read from, write to, or touch the nested duplicate at all.
- The collection already has real, ingested data — do NOT re-run `ingest.py` or re-ingest anything. This task only touches metadata on existing chunks (phase 1) and reads from the collection (phases 2-3).

## Phase 1: Fix subject metadata

Some chunks have garbage `subject` metadata values, caused by `ingest.py`'s `extract_grade_subject()` falling back to a filename guess when a source PDF didn't have a clean `"SUBJECT GRADE N"` header. Confirmed via direct inspection, current distinct subjects in the collection are:

```
['Agriculture', 'Agriculture 30.07.2024', 'Creative Arts', 'English Updated Revised Sept',
 'Final Indigenous Language Revised Oct', 'Indigenous Languages',
 'Primary School Education Curriculum Design Arabic Language']
```

Write and run a one-time metadata migration script (`fix_subjects.py`, project root) that remaps these using `collection.update()` (metadata-only, does not touch embeddings or documents, no re-embedding needed):

```python
SUBJECT_FIXES = {
    "Agriculture 30.07.2024": "Agriculture",
    "English Updated Revised Sept": "English",
    "Final Indigenous Language Revised Oct": "Indigenous Languages",
    "Primary School Education Curriculum Design Arabic Language": "Arabic",
}
```

Note: the `"Arabic"` mapping is inferred from a messy filename-derived string, not confirmed against an authoritative source — print a clear note in the script's output flagging this specific mapping as a guess, so it's easy to spot and correct later if wrong. The other three mappings are unambiguous.

After running the fix, print the full distinct `subject` and `grade` lists again to confirm the cleanup worked and nothing was missed.

## Phase 2: Build the FastAPI backend

### `backend/main.py`
- FastAPI app, CORS allowing `http://localhost:3000`
- `GET /health` — returns `{"status": "ok", "chroma_chunk_count": <int>}`
- `GET /api/curriculum/options` — returns the ACTUAL distinct grade/subject/strand/sub_strand values currently in ChromaDB (post-fix), not a hardcoded list:
  ```
  { grades: string[], subjects: string[], strandsBySubject: Record<string,string[]>, subStrandsByStrand: Record<string,string[]> }
  ```
  This matters because the frontend's current mock dropdown offers subjects like "Mathematics" and "Science & Technology" that have zero real data behind them, and doesn't expose real subjects like "Creative Arts" or "Indigenous Languages" at all — this endpoint fixes that mismatch so testing reflects what's actually searchable.
- `POST /api/curriculum/search` — the main endpoint. Accepts:
  ```
  { grade: string, subject: string, strand?: string, sub_strand?: string, content_type?: string, query?: string }
  ```
  - **No `query` (pure filter browsing):** use `collection.get(where={...})` with a metadata filter on whichever of grade/subject/strand/sub_strand were given. This is plain metadata filtering — don't spend an embedding call on it.
  - **`query` provided:** use `collection.query(query_texts=[query], where={...})` for semantic search within the filtered set.
  - Split each returned chunk into multiple `EvidenceItem` objects (one per category) per the parsing rules below.
  - If `content_type` is provided, only return items matching that category after splitting.
  - Return `{ results: EvidenceItem[], total: number }`. Empty matches -> `{ results: [], total: 0 }`, never a 500.

### `backend/chroma.py`
- `chromadb.PersistentClient(path="kicd_chroma_db")` (the top-level path, per the warning above)
- Import `GeminiEmbeddingFunction` from the existing `gemini_embedding.py` — do not modify that file
- Log `collection.count()` at startup

### Frontend `EvidenceItem` shape the API must match exactly (do not change this interface):
```typescript
interface EvidenceItem {
  id: string;
  category: ContentCategory; // "Specific Learning Outcomes" | "Suggested Learning Experiences" | "Key Inquiry Questions" | "Core Competencies" | "Values" | "Pertinent and Contemporary Issues" | "Resources" | "Assessment"
  grade: string;
  subject: string;
  strand: string;
  subStrand: string;
  page: number;
  designTitle: string;
  content: string;
  sourceRendering: "reconstructed-table" | "raw-text";
  sourceExcerpt: string;
}
```

## Parsing a chunk into EvidenceItems — read carefully, there are real gotchas

Each chunk's text is built by `ingest.py`'s `build_chunks()`. Exact shape (verified against the real source, confirmed labels below are exact):
```
Grade: Grade 5
Subject: Agriculture
Strand: Food Production Processes
Sub-strand: Soil Conservation
Specific Learning Outcomes: By the end of the sub-strand...
Suggested Learning Experiences: Learners are guided to...
Key Inquiry Question: Why is it important...
Suggested Assessment Methods: Observation schedule...          [only if present]
Suggested Learning Resources: School farm, jembes...             [only if present]
Suggested Non-formal Activities: ...                             [only if present]
Assessment Rubric:
Level Indicator | Exceeds Expectations | ...                    [only if present, multi-line]
```

**Exact label -> frontend category mapping — use these exact strings, do not fuzzy-match:**

| Exact label in chunk text | Frontend `category` | Notes |
|---|---|---|
| `Specific Learning Outcomes:` | `Specific Learning Outcomes` | direct |
| `Suggested Learning Experiences:` | `Suggested Learning Experiences` | direct |
| `Key Inquiry Question:` | `Key Inquiry Questions` | **singular in the source, plural in the frontend category — don't miss this** |
| `Suggested Assessment Methods:` + `Assessment Rubric:` (if either present) | `Assessment` | merge into one EvidenceItem, rubric text appended after the methods text if both present |
| `Suggested Learning Resources:` + `Suggested Non-formal Activities:` (if present) | `Resources` | merge into one EvidenceItem, non-formal activities appended as an extra labeled line |

**`Core Competencies`, `Values`, and `Pertinent and Contemporary Issues` are never present in ingested chunks** — `ingest.py`'s own docstring documents this as a known gap (`pcis` / `core_competencies` metadata fields exist but are always empty strings — this was a deliberate choice by whoever built ingest.py, to avoid fabricating data not actually in the source). Do NOT create EvidenceItems for these three categories, and do NOT invent or placeholder content for them — omit them entirely from results. If `content_type` filters to one of these three, return `{ results: [], total: 0 }`.

**Known precision limit, not a bug to fix — just don't make it worse:** `source_page` in the chunk metadata comes from the curriculum table's page only. If the Assessment Rubric or Assessment Methods actually came from a different page in the source PDF (common, since they're pulled from a separate table type), the resulting Assessment `EvidenceItem` will still show the curriculum table's page number, not its own true source page. Use the chunk's `source_page` metadata value for every split item's `page` field — this is a known, accepted limitation of the underlying data, not something to solve in this pass.

**Other rules:**
- Deterministic `id` per item: `hashlib.sha1(f"{grade}|{subject}|{strand}|{sub_strand}|{category}".encode()).hexdigest()[:12]` — must stay stable across requests since the frontend tracks selected evidence by id.
- `designTitle`: `f"KICD {grade} {subject} Curriculum Design"`
- `sourceRendering`: `"reconstructed-table"` for Specific Learning Outcomes, Suggested Learning Experiences, and Assessment; `"raw-text"` for Resources and Key Inquiry Questions.
- **`content` and `sourceExcerpt` should be identical text.** There's only one extracted representation in the real pipeline, not a separate "clean" and "raw" version. Don't paraphrase or clean up the text for `content` — that would mean generating text not actually in the source, conflicting with this project's evidence-first grounding principle. Use the parsed section text verbatim for both fields.

## Phase 3: Wire the frontend

Do NOT change the `EvidenceItem` interface or any component other than the two files below.

1. Create `frontend/src/lib/api.ts`:
   ```typescript
   async function searchCurriculum(params: { grade: string; subject: string; strand?: string; subStrand?: string; contentType?: string; query?: string }): Promise<{ results: EvidenceItem[]; total: number }>
   async function getCurriculumOptions(): Promise<{ grades: string[]; subjects: string[]; strandsBySubject: Record<string,string[]>; subStrandsByStrand: Record<string,string[]> }>
   ```
   reading the base URL from `process.env.NEXT_PUBLIC_API_URL` (add `NEXT_PUBLIC_API_URL=http://localhost:8000` to `frontend/.env.local`).

2. In `frontend/src/app/(workspace)/curriculum/page.tsx`:
   - Replace the static `evidenceItems` import and `useMemo` filter with a `useEffect`/`useState` call to `searchCurriculum()`, triggered whenever grade/subject/strand/subStrand/contentType/submittedQuery change. Add a simple loading state and fall back to the existing `EmptyResults` component on error or zero results.
   - Replace the hardcoded `grades`, `subjects`, `strandsBySubject`, `subStrandsByStrand` imports from `mockData.ts` with a call to `getCurriculumOptions()` on mount, so the filter dropdowns only ever show combinations that actually have real ingested data behind them.
   - Leave the JSX for the results grid itself untouched — it already expects `EvidenceItem[]`.

## Constraints

- Do NOT modify `agent.py`, `ingest.py`, or `gemini_embedding.py` — import from them only, except for the one-time `fix_subjects.py` migration script in Phase 1, which is new and separate.
- Do NOT touch Postgres, `/api/curriculum/explore`, `AssistantPanel.tsx`, or anything scheme/lesson/evaluation related — out of scope for this pass.
- Run the backend from the project root (`cbc-agent/`), not from inside `backend/`, since it needs `kicd_chroma_db/` and `gemini_embedding.py` at the root.
- Start command: `python -m uvicorn backend.main:app --reload --port 8000`

## Before you finish

Show me, in order:
1. The subject/grade lists before and after the Phase 1 fix.
2. The `/api/curriculum/options` response, so I can see what's really searchable now.
3. A real `/api/curriculum/search` response for a grade/subject combination confirmed to have data, specifically one that exercises the category-splitting logic on a chunk with at least Specific Learning Outcomes, Suggested Learning Experiences, and an Assessment-related field.
4. Confirmation that the frontend curriculum page loads, its dropdowns reflect real data, and a real search returns real KICD content instead of the Soil Conservation/Whole Numbers mock data.