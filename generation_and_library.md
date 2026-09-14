Add real .docx downloads for schemes of work and lesson plans, and wire the Library page to actually reflect what's confirmed in Postgres — it's currently 100% mock (`libraryItems` from `mockData.ts`), never fetches anything real. This is a three-phase task: backend document generation, backend endpoints, then Library page + review-page wiring.

## Important: do not reuse the existing `doc_generator.py` / `models.py` (`LessonPlan`, `SchemeOfWork`)

Those were built for the original CLI generation flow and their shapes don't match what the app actually stores today:
- `LessonPlan.organisation_of_learning` is a bare dict; the real `LessonPlanDraft` has separate `introduction`, `development: string[]`, `conclusion`, plus `assessmentActivity`, `title`, `date`, `duration`, `roll`, `teacherNotes` fields that don't exist on the old model at all.
- `LessonPlan`/`SchemeOfWorkEntry` include `core_competencies`, `pcis`, `values` — deliberately never generated in this app, since there's no source data for them in the ingested KICD chunks.
- `SchemeOfWork.entries` assumes one entry per individual numbered lesson; the real `TermPlanRow[]` is one row per week-range (e.g. `lessons: "4-6"`) with content repeated across it, by design.

Write new document-generation functions against the REAL shapes (below). You can reuse `doc_generator.py`'s `python-docx` *patterns* (landscape orientation for wide tables, styled headings, bullet lists) as a template — just feed them the real field names, not the old Pydantic models.

## Phase 1: Document generation (new file, e.g. `backend/documents.py`)

### `generate_scheme_docx(scheme_row: dict) -> bytes`
Input: a real `schemes_of_work` row — `{ grade, subject, term, year, content: { rows: TermPlanRow[] } }`.
- Landscape orientation (wide table).
- Title: `Scheme of Work — {subject}, {grade}, Term {term} {year}`.
- One table row per `TermPlanRow`, columns in this order: Week, Lessons, Strand, Sub-strand, Key Inquiry Question, Specific Learning Outcomes, Suggested Learning Experiences, Resources, Assessment, Reflection.
- Return the document as `bytes` (write to an `io.BytesIO()`, not a file path) so it can be streamed directly by the endpoint.

### `generate_lesson_docx(lesson_row: dict, scheme_row: dict | None) -> bytes`
Input: a real `lesson_plans` row — `{ lesson_date, strand, sub_strand, content: LessonPlanDraft }` — plus the parent scheme row if `scheme_id` was set (for grade/subject/term/year context in the header; omit that line cleanly if `scheme_row` is `None` rather than erroring).
- Title: `Daily Lesson Plan`.
- Header block: title, date, duration, roll, and — if available — grade/subject/term/class from the parent scheme.
- Sections, in order: Specific Learning Outcomes, Key Inquiry Question, Core Competencies (from the teacher-entered `competencies` field — this one IS teacher-authored, unlike the old model's fabricated version), Values and PCIs (same, teacher-entered), Learning Resources, Introduction, Main Learning Activities (numbered list from `development`), Assessment Activity, Lesson Closure, Teacher Notes, Reflection (leave blank/lined if empty, same pattern as the old CLI version).
- Return `bytes`, same as above.

## Phase 2: Backend endpoints (`backend/main.py`)

- `GET /api/schemes/{id}/download` — fetch the real scheme, call `generate_scheme_docx`, return as a file response with `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document` and a sensible `Content-Disposition` filename (e.g. `Scheme_of_Work_{subject}_{grade}.docx`, sanitized). 404 if the scheme doesn't exist.
- `GET /api/lessons/{id}/download` — same pattern; if the lesson has a `scheme_id`, fetch that scheme too and pass it through for header context; if `scheme_id` is null, pass `None` and confirm `generate_lesson_docx` handles that gracefully (it should, per Phase 1).
- `GET /api/library` — new endpoint. Query `schemes_of_work` WHERE `status = 'confirmed'` and `lesson_plans` WHERE `status = 'confirmed'`, and return a unified list:
  ```
  { items: [{ id, type: "Scheme of Work" | "Lesson Plan", grade, subject, term, year, updatedAt, evidenceCount }] }
  ```
  - `grade`/`subject`/`term`/`year` come directly off `schemes_of_work` rows; for `lesson_plans` rows, join through `scheme_id` to its parent scheme for these fields (blank/omit if there's no linked scheme).
  - `evidenceCount`: for a scheme, the count of distinct `evidenceIds` across all rows in `content.rows`; for a lesson, leave it out or 0 if `LessonPlanDraft` doesn't carry evidence IDs directly — don't fabricate a number.
  - Order by `updatedAt` descending (most recent first).

## Phase 3: Frontend wiring

1. **Library page** (`frontend/src/app/(workspace)/library/page.tsx`): replace the `libraryItems` mock import entirely. Fetch `/api/library` on mount (loading state while fetching, error state on failure — reuse `describeApiError`). If the list is empty, show a genuine empty state ("Nothing confirmed yet — schemes and lesson plans you confirm will appear here") instead of any seeded mock content, consistent with the empty-state pattern already used elsewhere in this app. Each item gets a "Download" button/link pointing at `GET {NEXT_PUBLIC_API_URL}/api/schemes/{id}/download` or `/api/lessons/{id}/download` depending on `type` — a plain `<a href=...>` is sufficient here, no need for a JS fetch-and-blob dance, since there's no auth token to attach.

2. **Remove the client-side mock library logic** in `WorkspaceContext.tsx`: `confirmTermPlan()` and `confirmLessonPlan()` currently construct a fake `LibraryItem` object locally and push it into a `library` array seeded from `seedLibrary` (mock data) — this is no longer the source of truth once Library fetches real data from Postgres, and leaving it in place would show duplicate or drifting entries. Remove the local `library` state and the `seedLibrary` import entirely; a simple "Confirmed — view it in Library" message on the confirmation success state is enough client-side feedback.

3. **Add a "Download" button to the Term Plans review page and Daily Lessons review page** too, for convenience right after confirming — enabled once `currentSchemeId`/`currentLessonId` is set (i.e. it's actually been saved), same `<a href>` pattern as Library.

## Constraints

- Do NOT touch Reflections or `evaluation_records` — out of scope, same as every prior pass. Library shows only confirmed schemes and lesson plans.
- Do NOT modify `agent.py`, `models.py`, the Strands migration work, or the assistant endpoint — unrelated to this task.
- Do NOT reuse the old `LessonPlan`/`SchemeOfWork` Pydantic models or `doc_generator.py`'s functions directly — new functions, real shapes, as specified above.
- If a lesson plan has no linked scheme (`scheme_id` is null), both the download and the Library listing must handle that gracefully — blank context, not an error.

## Before you finish

Show me:
1. A real downloaded `.docx` for a scheme with at least 2 weeks, opened/inspected, confirming the table has all 10 columns and real content, not placeholders.
2. A real downloaded `.docx` for a lesson plan, including one linked to a real scheme (context populated) and — if you can construct the case — one that was never linked to a saved scheme (confirm it doesn't crash).
3. The real `/api/library` response after confirming at least one scheme and one lesson plan through the actual UI, confirming it reflects Postgres, not stale client state.
4. Confirmation the Library page shows a genuine empty state on a fresh, never-confirmed setup, not fake seeded rows.