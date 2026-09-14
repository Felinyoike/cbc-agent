Rebuild Reflections around real data: which lessons need a reflection is now derived from real, confirmed `lesson_plans` rows (not the mock dated `initialLessons` array), reflections persist to Postgres, and the "Assistant summary" becomes a real Gemini call instead of a `useMemo` that just counts filled fields and templates a sentence.

## Why the reframe (context, not something to second-guess)

The current list of "lessons awaiting reflection" comes entirely from mock data with fake dates and statuses. Rather than build a whole second real system for that (a bigger, separately-scoped problem — deriving real dated lessons from term-plan rows was deliberately deferred during the Daily Lessons pass), reflections now attach directly to real, already-confirmed lesson plans instead — which is what `evaluation_records.lesson_id REFERENCES lesson_plans(id)` was designed for from the very first schema, just never used. "Awaiting reflection" becomes: confirmed lesson plans that don't have a confirmed reflection yet. This is a real, cleanly derivable list, not a workaround.

## Phase 0: Schema migration (idempotent, same pattern as previous passes)

```sql
ALTER TABLE evaluation_records ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE evaluation_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE evaluation_records ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE evaluation_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE evaluation_records ALTER COLUMN teacher_evidence DROP NOT NULL;
ALTER TABLE evaluation_records ALTER COLUMN achievement_status DROP NOT NULL;
```

`content` JSONB stores `{ evidence: { learnerActions, workEvidence, needSupport, difficulties, revisit }, outcomeStatus }` — the five structured evidence fields don't fit the old single `teacher_evidence TEXT` column, same reasoning as `lesson_plans.content` earlier. Keep `agent_summary` as its own real column (the genuine AI output belongs there, matching what it was always named for) and keep `achievement_status` too, populated redundantly from `content.outcomeStatus` for easy querying — both existing columns, just actually used now. The `teacher_evidence`/`achievement_status` NOT NULL constraints have to go since a draft can exist before either is filled in.

## Phase 1: Backend endpoints (`backend/main.py`)

- `GET /api/reflections` — confirmed `lesson_plans` LEFT JOIN `evaluation_records` (join through the scheme too, for grade/subject/term context, same pattern as `/api/library`'s lesson join). Returns:
  ```
  { items: [{ lessonId, lessonTitle, lessonDate, strand, subStrand, grade, subject,
               reflectionId: string | null, status: "not_started" | "draft" | "confirmed",
               evidence: {...} | null, outcomeStatus: string | null, agentSummary: string | null }] }
  ```
  `status` is `"not_started"` when there's no `evaluation_records` row at all, otherwise the row's own `status`. Order by `lessonDate` descending.
- `GET /api/reflections/by-lesson/{lesson_id}` — the single evaluation_record for one lesson, or a clean `null`/`404`-free empty shape if none exists yet (the frontend needs to distinguish "not started" from "record exists", not treat both as an error).
- `POST /api/reflections` — body `{ lesson_id, content: { evidence, outcomeStatus } }`. Insert with `status='draft'`, the seeded demo user.
- `PATCH /api/reflections/{id}` — update `content` only, bump `updated_at`.
- `POST /api/reflections/{id}/confirm` — **validate server-side, don't just trust the frontend already did**: reject with 400 if `content.evidence` has no non-empty field, or if `content.outcomeStatus` is unset — mirroring the same "enforce grounding/validity in code, not just in the UI" discipline used everywhere else in this app. On success: set `status='confirmed'`, copy `outcomeStatus` into `achievement_status`, insert a `confirmation_logs` row (`entity_type='evaluation'`), return the updated row.

## Phase 2: Real AI summary

### New function in `agent.py`: `generate_reflection_summary`
Same Strands pattern as the other two generation functions (fresh `Agent` per call on the shared `GeminiModel`) — but this one returns plain text, not a structured schema, so `agent(prompt)` is fine, no `structured_output` needed.

Persona/constraints:
- Summarize ONLY what the teacher actually wrote across the five evidence fields — never invent a claim about learner performance that wasn't stated.
- **Never suggest, imply, or hint at an achievement status.** This is a hard rule, not a style preference — the whole point of this screen, stated in its own UI copy, is that the status decision belongs to the teacher alone. If the evidence is thin, say so ("limited evidence recorded") rather than speculating about what it might mean for achievement.
- Keep it short — a working teacher wants a quick, honest reflection of their own notes, not an essay.
- Plain text output — reuse the same markdown-stripping approach already built for the assistant endpoint if you're calling through similar infrastructure; if this goes through a separate path, apply the same unconditional cleanup rather than relying on the prompt alone (we already learned prompt-only formatting instructions aren't reliably followed).

### New endpoint: `POST /api/generate/reflection-summary`
Accepts `{ evidence: { learnerActions, workEvidence, needSupport, difficulties, revisit } }`, calls `generate_reflection_summary`, returns `{ summary: string }`. If all five fields are empty, return 400 rather than generating from nothing. Real 502 on failure, same as every other generation endpoint.

This is an **explicit, on-demand action** (a "Generate summary" button), not automatic on every keystroke — consistent with how every other generation feature in this app works, and avoids burning API calls while the teacher is still typing.

## Phase 3: Frontend wiring

1. **`reflections/page.tsx`**: replace `useWorkspace().reflections`/`pendingReflectionCount` with a fetch to `GET /api/reflections` on mount (loading/error states, same pattern as Library). Bucket into "Awaiting your evidence" (`status` is `"not_started"` or `"draft"`) and "Confirmed reflection records" (`status === "confirmed"`), matching the existing two-section layout. Link each card to `/reflections/{lessonId}` (the route param becomes a lesson id now, not a mock reflection id).

2. **`ReflectionWorkspace.tsx`**: fetch the real lesson via the already-existing `GET /api/lessons/{id}` (for title, date, strand, sub-strand, and — if linked — grade/subject/term via its scheme), plus `GET /api/reflections/by-lesson/{lessonId}` for any existing draft/confirmed record. Fix the two hardcoded bugs:
   - The literal JSX text `"Food Production Processes › Soil Conservation"` — use the real fetched strand/subStrand.
   - `outcomeEvidence = evidenceItems.find(item => item.id === "ev-agri-slo-13")` — a `lesson_plans` row doesn't store evidence IDs (confirmed during the Library work), so there's no reliable way to re-fetch the exact original KICD evidence for an arbitrary lesson server-side. Best-effort only: if `evidenceById` (from `WorkspaceContext`) happens to have a matching entry for this lesson's strand/subStrand from earlier in the session, show it; otherwise omit the "Specific Learning Outcomes" evidence card entirely rather than falling back to a hardcoded ID. Don't fabricate a fallback.
   - Replace the `assistantSummary` `useMemo` entirely with a "Generate summary" button calling the new endpoint, a loading state while it runs, and persist the result into the record's `content`/`agent_summary` via the existing save mechanism once generated (so it isn't lost on reload).
   - Wire "Save reflection draft" and "Confirm reflection record" to the real create/update/confirm endpoints (create-then-update pattern, same as schemes and lessons — track the reflection id once it exists).

3. Add the corresponding functions to `frontend/src/lib/api.ts`.

## Constraints

- Do NOT touch the Library page or its endpoint — confirmed reflections are explicitly NOT added to Library in this pass (a reasonable follow-up, not part of this task).
- Do NOT attempt to rebuild the Daily Lessons list or derive real dated lessons — that's the deliberately deferred piece this whole reframe exists to route around, not something to revisit now.
- Do NOT modify `agent.py`'s other generation functions or the assistant endpoint.
- The achievement-status grounding rule is as non-negotiable here as evidence-grounding has been everywhere else: the summary function must never nudge toward a status judgment. If you're unsure whether a sentence crosses that line, leave it out.

## Before you finish

Show me:
1. The real `/api/reflections` response after confirming at least one lesson plan through the actual UI with no reflection yet — confirm it shows up as `"not_started"`, not missing or erroring.
2. A real `POST /api/generate/reflection-summary` call with genuinely thin evidence (e.g. only one of the five fields filled) and confirm the summary honestly reflects that thinness rather than padding it out, and contains no achievement-status language.
3. Confirmation that confirming a reflection with empty evidence is rejected with a 400 from the server itself, not just blocked by frontend validation (test by calling the endpoint directly, bypassing the UI).
4. A full click-through: pick a real confirmed lesson with no reflection, fill in evidence, generate a real summary, choose an outcome status, confirm, and reload the page to confirm it now shows as confirmed with the real data intact.