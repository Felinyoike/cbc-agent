Reconcile two branches that diverged badly: `main` (current HEAD, has the full tested Reflections/assistant/generation work) and `origin/qwen-bedrock-integration` (adds AWS Bedrock/Qwen as an alternative model provider, but was forked before Reflections existed). A previous merge (PR #1, already on `origin/main` as commit `da7f5f7`) incorrectly kept the Bedrock branch's OLDER versions of several files, silently deleting real, tested, already-shipped functionality. This task fixes that — do not simply accept that merge or redo it the same way.

## What was silently lost by the bad merge — confirmed via `git diff HEAD..origin/main`

- `backend/plain_text.py` — deleted entirely (the shared markdown-cleanup module used by both the assistant and reflection-summary generation).
- `backend/main.py` — all six real reflection endpoints removed (`GET /api/reflections`, `GET /api/reflections/by-lesson/{id}`, `POST /api/reflections`, `PATCH /api/reflections/{id}`, `POST /api/reflections/{id}/confirm`, `POST /api/generate/reflection-summary`), along with their server-side validation rules (one reflection per lesson, can't edit after confirming, invalid status rejected, reflecting on an unconfirmed lesson blocked, empty evidence/missing status rejected).
- `agent.py` — `generate_reflection_summary` and all its supporting code (`REFLECTION_EVIDENCE_LABELS`, `REFLECTION_SUMMARY_PERSONA`, `_STATUS_LANGUAGE`, `_drop_status_sentences`) deleted entirely.
- `frontend/src/app/(workspace)/reflections/page.tsx` and `ReflectionWorkspace.tsx` — reverted to importing mock data (`@/data/mockData`), the real `getReflections` API call removed.
- `backend/db/schema.sql` / `connection.py` — likely reverts the `evaluation_records` migration (content JSONB, status, user_id, updated_at columns, relaxed NOT NULL constraints) — verify and confirm.

None of this was an intentional design decision on the Bedrock branch's part — it's a byproduct of an incomplete three-way merge. All of it needs to come back exactly as it was on `main` before this reconciliation, with the Bedrock additions layered on top, not instead of it.

## What to actually keep and integrate from the Bedrock branch

From `git diff HEAD..origin/main -- agent.py`, the real, wanted additions are:
- `use_bedrock` provider-selection flag (Bedrock if AWS env vars are configured or no Gemini key is present, otherwise Gemini)
- The Bedrock branch of `_structured_output` using `bedrock_client.converse()` with a manually-embedded JSON schema instruction and markdown-fence cleanup
- `_structured_output_with_recitation_retry` skipping the Gemini-specific recitation retry entirely when `use_bedrock` is true (correct — Bedrock/Qwen has no equivalent concept)
- The embedding function swap (`BedrockEmbeddingFunction` vs `GeminiEmbeddingFunction`) based on the same flag
- New supporting files: `bedrock_embedding.py`, the AWS-related additions to `.env.example`, `requirements.txt`'s new dependency, and `ingest.py`'s changes

Also check `backend/assistant.py`'s diff (22 lines changed) and `backend/db/schema.sql`/`connection.py`'s diffs for any other genuinely new, wanted Bedrock-related additions beyond what's listed above — integrate those too, following the same principle: add what's new, don't lose what's already there.

## The compatibility gap to fix while you're in there

`generate_reflection_summary` currently (on `main`) does:
```python
agent = Agent(model=gemini_model, system_prompt=REFLECTION_SUMMARY_PERSONA, callback_handler=None)
```
This breaks under `use_bedrock=True`, since `gemini_model` is explicitly `None` in that branch. This function was written before Bedrock support existed and was never made provider-aware. Fix it: give it the same provider branching the other generation functions have. Since this function returns plain text (not a structured Pydantic model), you'll need a small plain-text equivalent of the Bedrock path in `_structured_output` — call `bedrock_client.converse()` directly with the persona as the system prompt and return `response["output"]["message"]["content"][0]["text"]`, no JSON schema wrapping needed. Apply the same `_drop_status_sentences` / plain-text cleanup to that output regardless of which provider produced it — the achievement-language filter must not become Gemini-only.

## Verification — re-run the real tests already established for this feature, don't just trust that the code looks right

1. With Gemini selected (no AWS env vars, or `GEMINI_API_KEY` present and preferred): confirm `generate_term_plan_content`, `generate_daily_lesson_content`, and `generate_reflection_summary` all still work exactly as before — same grounding behavior, same RECITATION retry-and-reword still functioning.
2. With Bedrock selected: confirm the same three functions produce valid, correctly-typed output through the Bedrock code path, and specifically confirm `generate_reflection_summary` no longer crashes and still strips achievement-language sentences in code (not just via the prompt) — this rule is non-negotiable regardless of provider.
3. Confirm all six reflection endpoints exist again in `backend/main.py` and pass the same validation checks already established (empty evidence → 400, no status → 400, second reflection on same lesson → 409, confirmed reflection edit → 409, reflection on unconfirmed lesson → 400).
4. Confirm the Reflections frontend pages fetch from the real API again, not mock data.
5. Confirm `backend/plain_text.py` exists and both the assistant and reflection-summary paths import from it rather than each having their own copy.

## Constraints

- Do NOT lose any Bedrock/Qwen functionality in the process of restoring the Reflections work — this is a genuine merge of two real feature sets, not a revert of one in favor of the other.
- Do NOT modify the curriculum search or term-plan generation logic beyond what's needed for the provider-selection pattern already established in `agent.py`.
- Show me a diff of the final reconciled files before committing, not just a summary — I want to see the actual code, especially the new plain-text Bedrock path in `generate_reflection_summary`.

## After reconciliation

`origin/main` currently has the bad merge live on it (commit `da7f5f7`). Once this is fixed and verified locally, we'll need a plan to correct `origin/main` itself — don't push anything yet, just get local `main` into a fully correct, tested state first and report back.