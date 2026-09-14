Migrate `agent.py`'s existing generation functions from raw `google.genai` calls to the Strands Agents SDK's Gemini provider. This is a like-for-like migration — same deterministic behavior, same grounding guarantees, same RECITATION-retry logic — just running on Strands instead of a parallel SDK. Do NOT make these functions "agentic" (no autonomous tool selection here) — they stay fixed-purpose functions called by specific button clicks in the UI, where there's no ambiguity for a model to reason about. That kind of autonomy belongs to a separate, new assistant endpoint (a different task, not this one).

## Install
```
pip install 'strands-agents[gemini]' strands-agents-tools
```
Add both to `requirements.txt`.

## What to change in `agent.py`

Replace:
```python
ai_client = genai.Client(api_key=api_key)
```
with:
```python
from strands import Agent
from strands.models.gemini import GeminiModel

gemini_model = GeminiModel(
    client_args={"api_key": api_key},
    model_id="gemini-3.1-flash-lite",  # keep the exact model already in use
    params={"temperature": 0.2},
)
structured_agent = Agent(model=gemini_model)  # no tools — pure structured output, used by all three functions below
```

For each of the three generation functions (`generate_lesson_plan`, `generate_term_plan_content`, and `generate_daily_lesson_content` if it already exists from the Daily Lessons pass):

1. Replace the manually-built `manual_schema` dict + `ai_client.models.generate_content(..., response_schema=manual_schema)` call with `structured_agent.structured_output(SomeModel, prompt)`, where `SomeModel` is a Pydantic model matching the exact fields the function currently returns. `generate_lesson_plan` already has one (`LessonPlan` from `models.py`) — reuse it. For `generate_term_plan_content` and `generate_daily_lesson_content`, define small Pydantic models locally (or in `models.py` for consistency) with exactly the fields currently in their manual schema dicts — don't add or drop fields during this migration.
2. **Preserve the RECITATION retry exactly as it works today.** Before changing anything, check how Strands' `structured_output()` surfaces a Gemini RECITATION refusal — whether it raises an exception with the finish reason accessible, or returns something falsy. Confirm you can still specifically detect "refused due to recitation" (not just any failure) so the existing retry-once-with-reworded-request logic keeps working, and still raises a real error if the retry also fails. If Strands abstracts this detail away entirely and you can't distinguish a recitation refusal from other failures, tell me before proceeding — that would mean either finding Strands' lower-level access to the raw response, or keeping the recitation-detection logic exactly as it is today via that lower-level access rather than losing it.
3. **Preserve the code-level grounding enforcement exactly as it works today** — the part of `generate_term_plan_content` that forces a field to empty string when its source category wasn't in the supplied evidence, regardless of what the model returned. This logic runs on the function's own return value after getting a response and doesn't depend on which SDK produced that response — just make sure it's still there, still runs, and isn't accidentally left out during the rewrite.
4. System prompts (the persona/instructions text) stay word-for-word the same — this is a mechanical SDK swap, not a prompt-engineering pass.

## Constraints

- Do NOT change what any of these functions accept as input or return as output — same signatures, same shapes, callers in `backend/main.py` should need zero changes.
- Do NOT add tools to `structured_agent` — it's structured-output-only, no autonomous behavior here.
- Do NOT touch `backend/main.py`, `ingest.py`, `gemini_embedding.py`, or the ChromaDB retrieval logic.
- If `gemini-3.1-flash-lite` isn't accepted by Strands' `GeminiModel` for any reason, tell me rather than silently switching to a different model.

## Before you finish

Show me:
1. A real generation call through the new code path for both `generate_term_plan_content` and `generate_daily_lesson_content`, confirming output is identical in shape and grounding behavior to before the migration (re-run whatever real evidence you used to validate them originally).
2. Specifically trigger a RECITATION-style refusal again (the same kind of near-verbatim KICD text that caused it before) and confirm the retry-and-reword behavior still works, with a real example of the retry succeeding.
3. Confirm `requirements.txt` is updated and a fresh `pip install -r requirements.txt` in a clean venv would actually work (no missing transitive dependency).