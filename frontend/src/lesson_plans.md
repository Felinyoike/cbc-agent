Scoped fix for the Daily Lesson workflow: fix existing bugs, add a term-plan-row picker (since a lesson plan currently always defaults to the first row, which breaks for any later week), wire real Postgres persistence, and add real Gemini generation grounded in the selected row. Explicitly NOT in scope: rebuilding the Daily Lessons list screen to derive real dates from term-plan rows, or supporting multiple simultaneous lesson plans — that's documented future work, not this pass. The single global `lessonPlan` draft stays, just genuinely connected to real data instead of a mock array.

## Bugs to fix (do these first, across the three files below)

1. **`daily-lessons/plan/page.tsx`'s `lessonEvidence`** filters the static `evidenceItems` mock array by hardcoded `"Agriculture"`/`"Soil Conservation"` — same bug class already fixed in term-plans. Fix: resolve evidence from the selected term-plan row's `evidenceIds` through `WorkspaceContext`'s existing `evidenceById` map.
2. **`daily-lessons/review/page.tsx`'s `citedEvidence`** hardcodes three literal mock evidence IDs (`"ev-agri-slo-13"`, etc.) that reference the deleted mock array. Same fix: derive from the selected row's `evidenceIds` via `evidenceById`.
3. **The review page's header hardcodes `"Food Production Processes · Soil Conservation"`** directly in JSX. Fix: read from the selected term-plan row's `strand`/`subStrand`.
4. **`teacherEdits` on the review page** compares against the static `initialLessonPlan` mock. Fix: add a `generatedLessonContent` baseline to `WorkspaceContext` (same pattern as `generatedRowContent` for term plans) — captured when generation runs, `undefined` if the teacher never generated (in which case every non-empty field the teacher typed correctly counts as their own input, not an "edit" of something that doesn't exist).
5. **`confirmLessonPlan()`** hardcodes `grade: "Grade 5"`, `subject: "Agriculture"`, `className: "5 East"` in its library entry — same bug already fixed in `confirmTermPlan`. Fix: use real `TeachingContext` values.
6. **Discard resets to `initialLessonPlan`** (a fully-seeded mock draft), not a genuinely empty one. Fix: define an empty `LessonPlanDraft` (all string fields `""`, `development: []`) and reset to that instead, matching the "empty state, not fake starter data" fix already applied to term plans.
7. **The review page's "AI-assisted organization" table fabricates data**: a hardcoded `stepMinutes` array and hardcoded notes (`"Recalls Lesson 3"`, `"Practical — supervise tool use"`, `"Group work"`, `"Written record"`) that display regardless of the actual lesson content — this currently *looks* like real AI-generated timing and pedagogical notes but isn't. Fix: remove the fabricated Time/Notes columns entirely; show Step and Activity only (what's actually known), until/unless real per-step timing becomes part of genuine generation output.

## Phase 1: Term-plan-row picker (frontend, do this before generation/persistence)

Add a row selector to `daily-lessons/plan/page.tsx` — a simple dropdown listing `termPlanRows` by `Week ${row.week} · ${row.subStrand}`, replacing the current `termPlanRows.find(row => row.id === "row-w4") ?? termPlanRows[0]` logic entirely. Store the selected row's id in `WorkspaceContext` (e.g. `selectedTermPlanRowId`). If `termPlanRows` is empty, show an empty state ("No term plan rows yet — build one in Term Plans first," linking there) instead of rendering the form against `undefined`.

## Phase 2: Postgres persistence

### Schema migration
Add one column, idempotently:
```sql
ALTER TABLE lesson_plans ADD COLUMN IF NOT EXISTS content JSONB;
```
Store the full `LessonPlanDraft` object here — don't force it into the existing narrow `learning_outcomes`/`activities`/`resources` TEXT[] columns, which would silently drop fields like key inquiry question, introduction, conclusion, and teacher notes that those columns have no room for. Keep populating `scheme_id`, `user_id`, `lesson_date`, `strand`, `sub_strand`, and `status` as real columns (useful for filtering later), same division as `schemes_of_work`'s `content` JSONB alongside its real columns.

### New endpoints in `backend/main.py` (mirror the existing schemes endpoints exactly)
- `POST /api/lessons` — body: `{ scheme_id, lesson_date, strand, sub_strand, content: LessonPlanDraft }`. Insert with `status='draft'`, the seeded demo user.
- `PATCH /api/lessons/{id}` — body: `{ content: LessonPlanDraft }`. Updates `content` only.
- `GET /api/lessons/{id}`
- `POST /api/lessons/{id}/confirm` — sets `status='confirmed'`, inserts a `confirmation_logs` row (`entity_type='lesson_plan'`), same transaction pattern already used for scheme confirmation.

## Phase 3: Real generation

### New endpoint: `POST /api/generate/lesson-plan`
Accepts the selected term-plan row's own fields directly (it already has organized, grounded content — no need to re-touch ChromaDB):
```
{ grade, subject, strand, subStrand, keyInquiryQuestion, outcomes, experiences, resources, assessment }
```

Behavior:
- Add a new function to `agent.py`, `generate_daily_lesson_content`, following the exact same pattern as `generate_term_plan_content` — same client setup, same RECITATION-retry-once approach, same hard grounding constraint (only use the supplied row content, never invent an activity, resource, or fact not present in it).
- Generate ONE lesson's worth of content: `introduction` (a short starter drawing on the row's outcomes/inquiry question), `development` (2-4 steps derived from `experiences` — if the row's lesson range spans multiple lessons, e.g. "1-3", focus the plan on a single lesson's worth of activity, don't try to compress all of them into one plan), `assessmentActivity` (derived from `assessment`), `conclusion` (a short closing tied to the outcomes).
- Do NOT generate `competencies` or `valuesAndPcis` — this data does not exist in the ingested KICD chunks (confirmed absent during the original ingestion review), so there's nothing to ground them in. Leave these as teacher-only fields in the UI, exactly like `title`, `date`, `duration`, `roll`, and `teacherNotes` already are.
- Response: `{ keyInquiryQuestion, outcomes, resources, introduction, development: string[], assessmentActivity, conclusion }` — `keyInquiryQuestion`/`outcomes`/`resources` can pass through the row's own values directly (already grounded), the rest is genuinely generated.
- If Gemini fails after the retry, return a real 502, same as term-plan generation.

## Phase 4: Wire the frontend

1. Add a "Generate from this row" button near the row picker (only enabled once a row is selected) — same async/loading-state pattern as term-plan generation's "Generating weekly rows…". On success, populate the relevant `lessonPlan` fields and capture `generatedLessonContent` for the review page's edit-diff logic. Generation is optional, not automatic — the existing UI copy ("Every field is yours to edit... it never fills this form in for you") should still basically hold: generation fills a *starting* draft, the teacher edits from there.
2. Wire "Save as draft" the same create-then-update pattern as term plans (`currentLessonId` state, `POST` on first save, `PATCH` after).
3. Wire `confirmLessonPlan()` to call `POST /api/lessons/{id}/confirm`, creating first via `POST /api/lessons` if never saved, same pattern as `confirmTermPlan`.
4. Add the corresponding functions to `frontend/src/lib/api.ts`.

## Constraints

- Do NOT touch the Daily Lessons list screen (`daily-lessons/page.tsx`) beyond what's strictly needed to compile — its disconnection from real term-plan data is documented, deliberate, out-of-scope follow-up work, not a bug to fix now.
- Do NOT modify `agent.py`'s existing `generate_lesson_plan` or `generate_term_plan_content` functions, or any curriculum-search/term-plan endpoint already working.
- Do NOT attempt to generate `competencies` or `valuesAndPcis` — no source data exists for them; leave them teacher-only.
- Grounding is non-negotiable, same standard as term-plan generation: if you're unsure whether generated text is grounded in the row's actual content, leave it empty rather than invent.

## Before you finish

Show me:
1. Confirmation all seven listed bugs are fixed — specifically, walk through selecting a term-plan row that is NOT the first one, and confirm the evidence panel and review page show that row's real content, not the first row's or mock content.
2. A real `POST /api/generate/lesson-plan` response, and confirm it doesn't introduce anything beyond what the source row actually contained.
3. Confirmation "Save as draft" and "Confirm and save" actually persist to Postgres (`lesson_plans.content` populated, a `confirmation_logs` row written on confirm).
4. Confirmation the fabricated Time/Notes columns are gone from the review page's activity table.