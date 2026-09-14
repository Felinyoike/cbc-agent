Build a real, autonomous Strands Agent for the AssistantPanel — currently 100% mock (a dictionary lookup keyed by exact question text, always falling back to a generic message for any real free-text question). This is the one place in the app where genuine agentic tool-selection belongs: the teacher's question is open-ended, so the agent — not fixed application code — should decide whether it already has enough grounding to answer or needs to look up more curriculum evidence first.

This is a different task from the earlier Strands migration of `generate_term_plan_content`/`generate_daily_lesson_content` — those stay fixed-purpose, deterministic, non-agentic (don't touch them here). This task is genuinely new functionality.

## Preserve this design principle exactly

The current component's own comment states it clearly: *"It never writes into the plan itself — suggestions stay in this panel so the structured form remains the source of truth."* The real agent must stay purely conversational. It never modifies `termPlanRows`, `lessonPlan`, or any other draft state — only returns text the teacher reads and decides what to do with, exactly like today.

## Backend: the agent and its tool

### New Strands `@tool`: `search_curriculum`
Wrap the existing curriculum search logic (`backend/main.py`'s `/api/curriculum/search` — the ChromaDB query/get plus `chunk_to_evidence_items` parsing) as a Strands tool the agent can call autonomously:
```python
from strands import tool

@tool
def search_curriculum(query: str, grade: str, subject: str, strand: str = "", sub_strand: str = "") -> str:
    """Search the official KICD curriculum for content matching a query, optionally filtered
    by strand/sub-strand. Use this when the teacher's question needs curriculum information
    beyond what's already provided in the conversation context."""
    # Reuse the existing search/parsing logic — don't duplicate it. Return a concise,
    # readable text block of matching evidence (category, content, source page) for the
    # agent to read, not a raw JSON blob.
```
Don't duplicate the ChromaDB query or parsing logic — import and call what already exists in `backend/main.py` (or refactor the shared parts into `backend/parsing.py`/`backend/chroma.py` if that's cleaner, your call, as long as there's exactly one implementation of curriculum search).

### The agent itself
```python
from strands import Agent
from strands.models.gemini import GeminiModel

assistant_model = GeminiModel(client_args={"api_key": api_key}, model_id="gemini-3.1-flash-lite", params={"temperature": 0.3})

ASSISTANT_PERSONA = """You are a planning assistant for a Kenyan CBC (Competency-Based Curriculum) teacher.
Your job is to help the teacher think through their lesson and term planning — explaining
curriculum language in plainer terms, suggesting practical activities, and pointing out what
still needs a decision. You are advisory only: you never write into or modify the teacher's
draft. Your response is read by the teacher, who decides what to actually use.

GROUNDING RULES:
- Base your answers on the curriculum evidence provided to you in the conversation, or
  retrieved via the search_curriculum tool if you need more. Never invent a specific learning
  outcome, activity, or fact and present it as if it came from KICD.
- You may draw on general teaching knowledge to help (e.g. suggesting how to run an activity
  with limited resources) — this is fine and expected, but be clear when you're doing so
  rather than presenting general advice as official curriculum content.
- If you don't have enough information to answer well, say so plainly rather than guessing.

Keep answers concise and practical — a working teacher wants a usable answer, not an essay."""

assistant_agent = Agent(model=assistant_model, system_prompt=ASSISTANT_PERSONA, tools=[search_curriculum])
```

### New endpoint: `POST /api/assistant/ask`
Accepts:
```
{ prompt: string, grade: string, subject: string, evidence: list[EvidenceIn] }
```
(reuse the existing `EvidenceIn` Pydantic model from `backend/main.py` — same shape already used by `/api/generate/term-plan-rows`)

Behavior:
- Build the agent's input by including the supplied evidence as context (e.g. a short preamble listing each evidence item's category and content) followed by the teacher's actual question.
- Call `assistant_agent(...)` — let it autonomously decide whether the supplied evidence answers the question or whether to call `search_curriculum` for more.
- Return `{ answer: string }`.
- If evidence is empty, that's fine — not every question needs curriculum grounding (e.g. "help me identify what I still need to decide" can be answered from the conversation itself). Don't require evidence to be non-empty.
- If the agent call fails, return a real 502 with the error, consistent with every other generation endpoint in this app — never silently return a placeholder success.

## Frontend: wire `AssistantPanel.tsx` and its callers

1. **`AssistantPanel.tsx`**: add a new prop `evidence?: EvidenceItem[]` (the real grounding material — keep the existing `context?: string` prop as-is, it's still used for the "Working from: ..." display label). Make `ask()` async: call a new `askAssistant(prompt, grade, subject, evidence)` function in `frontend/src/lib/api.ts` instead of the `assistantReplies` dictionary lookup. Get `grade`/`subject` from `useTeachingContext()` inside the component itself rather than threading them through as new props. Add a loading state (e.g. a "…" placeholder message while awaiting the response) and error handling (show a plain error message in the chat thread on failure, reusing `describeApiError`). The four suggested-prompt buttons should call the same real `ask()` — remove the `assistantReplies` dictionary and `FALLBACK` constant entirely, they're fully replaced now.

2. **Find every caller of `AssistantPanel`** (grep for it — at minimum `term-plans/page.tsx` and `daily-lessons/plan/page.tsx` use it, there may be others) and pass real evidence:
   - `term-plans/page.tsx`: pass `evidence={selectedEvidence}` (already available in that component).
   - `daily-lessons/plan/page.tsx`: pass the evidence for the currently selected term-plan row — resolve `sourceRow?.evidenceIds` through `evidenceById` (same pattern already used elsewhere in this file) to build the array.
   - Any other caller: use whatever real evidence is contextually available on that screen; if genuinely none exists, pass an empty array rather than fabricating something.

## Constraints

- Do NOT modify `generate_term_plan_content`, `generate_daily_lesson_content`, or `generate_lesson_plan` — those stay exactly as the earlier migration left them, non-agentic, untouched here.
- Do NOT let the assistant modify any draft state (`termPlanRows`, `lessonPlan`, etc.) — text-only responses the teacher reads, exactly as today's mock behavior already guarantees.
- Do NOT duplicate the ChromaDB search/parsing logic — the new tool must call the existing implementation, not reimplement it.
- Grounding matters here too, even though this is conversational rather than structured generation: the agent should not present invented curriculum specifics as if they came from KICD.

## Before you finish

Show me:
1. A real `POST /api/assistant/ask` exchange where the supplied evidence alone is enough to answer (confirm the agent does NOT call `search_curriculum` unnecessarily — check whatever tool-call trace or logging Strands exposes).
2. A real exchange where the question genuinely needs more than the supplied evidence, and confirm the agent actually calls `search_curriculum` and grounds its answer in what it found.
3. Confirmation that typing a genuinely free-text question in the browser (not one of the four suggested prompts) now gets a real, relevant answer instead of the old generic fallback message.
4. Confirmation the assistant's response never modifies any draft field — walk through asking it something on the Term Plans screen and confirm `termPlanRows` is completely unchanged afterward.