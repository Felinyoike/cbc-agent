This task has four phases: (0) fix two existing bugs, (1) wire Postgres persistence for schemes of work, (2) build a real AI generation endpoint replacing the current fake string-concatenation "AI-assisted" organization, (3) wire the frontend to all of it. Do these in order — each phase depends on the one before it.

Curriculum search (ChromaDB) is already built and working — don't touch `backend/main.py`'s existing `/api/curriculum/search` or `/api/curriculum/options` endpoints, just add to that file.

## Context: what's real vs. fake right now

`frontend/src/context/WorkspaceContext.tsx` currently manages term plans entirely client-side, persisted only to `localStorage`. There is no backend call anywhere in this flow. Specifically:

- `addTermPlanRowFromEvidence()` claims to be "AI-assisted" in the UI (see `review/page.tsx`'s "AI generated" badge and "How the assistant arranged the cited evidence" copy) but is actually just `selectedEvidence.filter(...).map(item => item.content).join(" ")` — plain string concatenation, no model call at all.
- `confirmTermPlan()` pushes a library entry with **hardcoded** `grade: "Grade 5"`, `subject: "Agriculture"`, `className: "5 East"` instead of reading the actual `TeachingContext`. This is wrong for any other grade/subject combination.
- "Save as draft" (`term-plans/page.tsx`) only sets a local `savedAt` timestamp — it doesn't call any persistence function at all, not even the existing localStorage layer.

## Real teacher scheme-of-work samples — read before building Phase 2

Six real, currently-used Kenyan teacher schemes of work were reviewed (Agriculture Grade 5 x2, Social Studies Grade 4, CRE Grade 4, Kiswahili Grade 4/5/6) to ground the generation design in actual practice rather than guesswork. Findings that directly change what you're about to build:

- **Every single sample includes a Key Inquiry Question(s) column** — this is a universal, non-optional field in real Kenyan schemes of work. `TermPlanRow` is missing it entirely right now — this must be added (see Phase 1a below).
- **Real schemes are lesson-numbered, not just week-numbered**, with a consistent, confirmed convention of **3 lessons per week** across every sample.
- **The current, officially-aligned "rationalized" format (2023 curriculum-load reduction reform) repeats the same grounded content across every lesson in a sub-strand's allocation** rather than inventing distinct day-to-day variation — e.g. the rationalized Agriculture and CRE samples show identical (or near-identical) outcome/inquiry-question/experience text repeated across lessons 1, 2, and 3 of a sub-strand's week. This is good news: it means faithful generation is a repetition task, not a creative-variation task, which keeps it honestly grounded.
- **Some subjects (notably Kiswahili) interleave multiple strands within a single week** (e.g. Listening & Speaking in lesson 1, Reading in lesson 2, same week) — this is a genuinely harder scheduling problem, closer to full timetabling, which is explicitly out of scope. Generation in this pass targets **one sub-strand at a time**, matching how the curriculum explorer already works (the teacher selects evidence for one sub-strand, then generates from it) — this sidesteps the multi-strand-interleaving problem entirely rather than attempting to half-solve it.

## Phase 1a: Add the missing field (do this alongside Phase 0, before Phase 1)

Add `keyInquiryQuestion: string` to the `TermPlanRow` interface in `mockData.ts`. This requires:
- A new column in `term-plans/page.tsx`'s desktop table (`SchemeRow`) between Sub-strand and Specific Learning Outcomes, matching where it appears in most of the real samples — an editable `EditableCell`, same pattern as the other text fields.
- A new `MobileField` in the mobile card view, same pattern as the existing fields.
- Display it in `term-plans/review/page.tsx`'s "AI-assisted organization" table as an additional column.
- No Postgres schema change needed — `content` is a JSONB blob, the new field just flows through automatically once it's part of the row shape.

## Phase 0: Fix two existing bugs (frontend only, do this before anything else)

### Bug 1 — hardcoded context in `confirmTermPlan`
In `WorkspaceContext.tsx`, `confirmTermPlan()` builds a library entry with hardcoded grade/subject/term/className strings. Fix it to use the actual `TeachingContext` values (grade, subject, term, className, year) instead. `WorkspaceContext` will need access to `TeachingContext` for this — check how `useTeachingContext()` is used elsewhere in the app for the right pattern to pull it in here.

### Bug 2 — stale evidence lookups against the static mock array
`term-plans/page.tsx` and `term-plans/review/page.tsx` both import `evidenceItems` from `mockData.ts` and filter it by ID to resolve citations (e.g. `review/page.tsx`'s `citedEvidence = evidenceItems.filter(item => ids.has(item.id))`). This breaks silently with real data: evidence selected from the now-live curriculum search has real IDs (deterministic hashes from the ChromaDB-backed search) that don't exist in that static array at all — so `citedEvidence` will show empty even when real evidence was genuinely cited.

Fix: add an `evidenceById: Record<string, EvidenceItem>` map to `WorkspaceContext`, accumulated (not replaced) every time `selectedEvidence` changes — so it remembers every real evidence item the teacher has ever selected this session, keyed by id. Update `term-plans/page.tsx` and `review/page.tsx` to resolve citations against this map instead of the static `evidenceItems` import. Also replace `term-plans/page.tsx`'s hardcoded fallback (`evidenceItems.filter(item => item.subject === "Agriculture" && item.subStrand === "Soil Conservation")` shown when nothing is selected) with a simple empty state prompting the teacher to visit the Curriculum Explorer — that hardcoded Agriculture/Soil Conservation fallback is stale mock content and shouldn't appear regardless of the teacher's real selected context.

## Phase 1: Postgres persistence

### `backend/db/connection.py`
- `psycopg2` with connection pooling, `DATABASE_URL` from `.env`.
- On startup, seed exactly one demo user if none exists (match `mockData.ts`'s `teacher` object: name "Ms. A. Wanjiru", role "teacher"). Use its `id` as the default `user_id` for every scheme call below — there is no login flow yet, don't build one.

### New endpoints in `backend/main.py`
- `POST /api/schemes` — body: `{ grade, subject, term, year, content: { rows: TermPlanRow[] } }`. Inserts into `schemes_of_work` with `status='draft'`, using the seeded demo user's id. Returns the created row including its new `id`.
- `PATCH /api/schemes/{id}` — body: `{ content: { rows: TermPlanRow[] } }`. Updates the existing row's `content` and `updated_at` (the trigger already handles `updated_at` — just update `content`). This is what "Save as draft" should actually call on every save after the first.
- `GET /api/schemes/{id}` — returns the scheme row.
- `POST /api/schemes/{id}/confirm` — sets `status='confirmed'`, inserts a `confirmation_logs` row (`entity_type='scheme'`, `entity_id`, the demo user's id, `action='confirmed'`), returns the updated scheme.

`TermPlanRow` is the existing frontend interface, now including `keyInquiryQuestion` from Phase 1a (id, week, lessons, strand, subStrand, keyInquiryQuestion, outcomes, experiences, resources, assessment, reflection, status, evidenceIds) — store it as-is inside the `content` JSONB column, don't design a new shape for it.

## Phase 2: Real AI generation, with real lesson-count pacing

### New endpoint: `POST /api/generate/term-plan-rows`
Accepts:
```
{ evidence: EvidenceItem[], grade: string, subject: string }
```
(the full `EvidenceItem` objects for ONE sub-strand the teacher selected — not just IDs, since the content itself is the grounding material)

Behavior:
1. **Determine the strand/subStrand from the incoming evidence** (they should all share one sub-strand, per the "one sub-strand at a time" scoping above — if the input spans more than one, group and process each separately, same as before).
2. **Look up real pacing from ChromaDB metadata**: query the collection (`collection.get(where={"grade": grade, "subject": subject, "strand": strand, "sub_strand": sub_strand})`) to retrieve the original chunk's `num_lessons` metadata field — this is real data already sitting in Chroma, never exposed through the search API but directly queryable here. If `num_lessons` is missing, empty, or unparseable, default to a single week (3 lessons) and don't fail the request — just proceed with the safe default.
3. **Compute the week/lesson split**: `weeks_needed = ceil(num_lessons / 3)`. For each week index, compute its lesson range label (e.g. lessons 1-3 → "1-3", a remainder of 2 → "4-5", a remainder of 1 → "6"). Real samples confirm 3 lessons/week is the standard convention — use it.
4. **Call Gemini ONCE per sub-strand group** (not once per week — content repeats across weeks in the rationalized pattern, so one generation call covers the whole sub-strand). Reuse the existing pattern from `agent.py`'s `generate_lesson_plan` — same structured-output approach, same model, same client setup, don't invent a new calling convention. Ask it to organize ONLY the provided evidence content into: `keyInquiryQuestion` (from the Key Inquiry Questions category evidence, if present in the input — if that category wasn't selected/provided, leave empty, do not invent a question), `outcomes`, `experiences`, `resources`, `assessment`. The model may rephrase for clarity but must not introduce any outcome, activity, fact, or question not present in the supplied evidence — this is a hard constraint. If evidence for a field is missing, leave that field as an empty string.
5. **Produce one output row per computed week**, all sharing the identical generated content from step 4, each tagged with its own `lessons` range label from step 3 and the same `evidenceIds`/`strand`/`subStrand`. This mirrors the real "rationalized" pattern directly rather than approximating it.

Response shape: `{ rows: Array<{ strand, subStrand, keyInquiryQuestion, outcomes, experiences, resources, assessment, evidenceIds, lessons }> }` — one array entry per week the sub-strand spans (usually more than one row per call now, not always exactly one). Do NOT include `id`, `week`, or `status` — those remain frontend-assigned, matching how the current mock code already divides responsibility (frontend owns row administrivia, generation owns content and real pacing).

If Gemini fails, return a real error (502 with the actual message), same pattern already established for curriculum search — never silently return empty/fabricated content on failure.

## Phase 3: Wire the frontend

1. In `WorkspaceContext.tsx`, replace `addTermPlanRowFromEvidence`'s body: instead of the synchronous string-join, call `POST /api/generate/term-plan-rows` with `selectedEvidence` and the current `TeachingContext` grade/subject. The response may now contain multiple rows (one per computed week) — for each returned row in order, assign a new `id`, the next sequential `week` number (continuing from the current max week in `termPlanRows`, incrementing once per row), and `status: "draft"`. This function becomes async — the "Add planning row" button in `term-plans/page.tsx` needs a loading state while the request is in flight (disable the button, show a small spinner or "Generating…" label, and consider indicating how many weeks' worth of rows are being generated).
2. Add `currentSchemeId` state to `WorkspaceContext` (starts `null`). Wire "Save as draft" in `term-plans/page.tsx`: if `currentSchemeId` is null, call `POST /api/schemes` and store the returned id; if it's already set, call `PATCH /api/schemes/{id}` instead. Keep updating the local `savedAt` display on success.
3. Wire `confirmTermPlan()` to call `POST /api/schemes/{currentSchemeId}/confirm` (creating the scheme first via `POST /api/schemes` if it was never saved as a draft) before updating local state the way it already does.
4. Add `NEXT_PUBLIC_API_URL`-based functions for all of the above to `frontend/src/lib/api.ts` (already exists from the curriculum search work) rather than inlining fetch calls in components.

## Constraints

- Do NOT modify `agent.py`, `ingest.py`, or `gemini_embedding.py` beyond adding a new generation function that follows the existing `generate_lesson_plan` pattern — reuse its model client setup, don't duplicate or reinvent it.
- Do NOT touch the existing `/api/curriculum/search` or `/api/curriculum/options` endpoints or their tested behavior.
- Do NOT build a login/auth flow — the single seeded demo user is sufficient for now.
- Do NOT change the `EvidenceItem` TypeScript interface. `TermPlanRow` DOES change (adding `keyInquiryQuestion`, per Phase 1a) — that's an intentional, necessary addition, not something to avoid.
- Do NOT attempt multi-strand weekly interleaving (the Kiswahili-style pattern) — one sub-strand per generation call is the deliberate scope for this pass.
- Grounding is non-negotiable: generated content must be traceable to the evidence actually supplied. If you're unsure whether a piece of generated text is grounded, leave the field empty rather than guess.

## Before you finish

Show me:
1. Confirmation Phase 0's two bugs are fixed — specifically, walk through selecting real evidence from the curriculum explorer, building a term plan from it, and viewing the review page's "Curriculum evidence used" section, confirming it now shows the real cited evidence instead of empty.
2. Confirmation the new Key Inquiry Question column appears and is editable in both the desktop and mobile term-plan views.
3. A real `POST /api/generate/term-plan-rows` response for a sub-strand with `num_lessons` greater than 3 (so I can see it correctly split into multiple week-rows with identical content and different lesson-range labels), and confirm the content doesn't introduce anything not present in the input evidence.
4. Confirmation that "Save as draft" then reloading the page (or checking Postgres directly) shows the scheme actually persisted, not just a local timestamp.
5. Confirmation that "Confirm and save" creates a `confirmation_logs` row — show me the actual row.