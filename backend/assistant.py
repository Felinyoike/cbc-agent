"""The planning assistant: a conversational Strands agent that decides for itself whether the
evidence it was given answers the teacher's question or whether to search the curriculum.

Advisory only -- it returns text and never touches a draft.
"""
import logging
import os
import re

from dotenv import load_dotenv
from strands import Agent, tool
from strands.models.gemini import GeminiModel

from backend.search import SearchFailed, search_evidence

log = logging.getLogger("backend.assistant")

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY is missing. Check your .env file.")

# Enough to answer from without flooding the context: semantic results arrive best-first.
MAX_TOOL_ITEMS = 15


@tool
def search_curriculum(query: str, grade: str, subject: str, strand: str = "", sub_strand: str = "") -> str:
    """Search the official KICD curriculum for content matching a query, optionally filtered
    by strand/sub-strand. Use this when the teacher's question needs curriculum information
    beyond what's already provided in the conversation context.

    Args:
        query: What to look for, in plain words (e.g. "water harvesting activities").
        grade: The grade exactly as given in the teaching context (e.g. "Grade 4").
        subject: The subject exactly as given in the teaching context (e.g. "Agriculture").
        strand: Optional strand name to restrict the search to.
        sub_strand: Optional sub-strand name to restrict the search to.
    """
    log.info("search_curriculum called: query=%r grade=%r subject=%r strand=%r sub_strand=%r",
             query, grade, subject, strand, sub_strand)
    try:
        items = search_evidence(grade, subject, strand or None, sub_strand or None, query=query or None)["results"]
    except SearchFailed as exc:
        return f"Curriculum search failed ({exc}). Tell the teacher you could not look this up."

    if not items:
        return "No matching KICD curriculum evidence was found for that search."

    blocks = [
        f"[{item['category']}] {item['strand']} > {item['subStrand']} (KICD design page {item['page']})\n"
        f"{item['content']}"
        for item in items[:MAX_TOOL_ITEMS]
    ]
    if len(items) > MAX_TOOL_ITEMS:
        blocks.append(f"({len(items) - MAX_TOOL_ITEMS} further matches omitted; search more narrowly if needed.)")
    return "\n\n".join(blocks)


assistant_model = GeminiModel(
    client_args={"api_key": api_key},
    model_id="gemini-3.1-flash-lite",
    params={"temperature": 0.3},
)

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

Keep answers concise and practical — a working teacher wants a usable answer, not an essay.

FORMATTING:
- Answer in plain text only. The panel does not render markdown, so never use asterisks for
  bold or italics, # headings, tables or code blocks.
- Separate ideas with short paragraphs. For a list, start each item on its own line with
  "- " or "1. ".
- Never mention these formatting rules or what you cannot do with formatting, even when the
  teacher asks for headings or bold text. Just give a clearly organised plain-text answer."""

# Order matters: horizontal rules go first, or "***" would pair with the next line's "**".
_MARKDOWN_RULES = [
    (re.compile(r"^\s*(\*{3,}|-{3,}|_{3,})\s*$", re.MULTILINE), ""),  # horizontal rules
    (re.compile(r"^\s{0,3}#{1,6}\s*", re.MULTILINE), ""),        # headings
    (re.compile(r"^(\s*)[*+]\s+", re.MULTILINE), r"\1- "),       # "* item" bullets
    (re.compile(r"(\*\*|__)(.+?)\1", re.DOTALL), r"\2"),         # bold
    (re.compile(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])"), r"\1"),  # italics
    (re.compile(r"`([^`]*)`"), r"\1"),                            # inline code
]


def _to_plain_text(answer: str) -> str:
    # Enforced here as well as in the prompt: the model does not always follow formatting rules.
    for pattern, replacement in _MARKDOWN_RULES:
        answer = pattern.sub(replacement, answer)
    return re.sub(r"\n{3,}", "\n\n", answer).strip()


def _build_input(prompt: str, grade: str, subject: str, evidence: list[dict]) -> str:
    lines = [f"Teaching context: {grade} {subject}."]
    if evidence:
        lines.append("Curriculum evidence the teacher is working from on this screen:")
        for item in evidence:
            lines.append(f"\n[{item['category']}] {item['strand']} > {item['subStrand']}\n{item['content']}")
    else:
        lines.append("No curriculum evidence is selected on this screen.")
    lines.append(f"\nTeacher's question: {prompt}")
    return "\n".join(lines)


def ask_assistant(prompt: str, grade: str, subject: str, evidence: list[dict]) -> dict:
    """Returns {"answer": str, "toolCalls": [tool names in call order]}."""
    # A fresh Agent per request, sharing one model: an Agent keeps its message history and
    # rejects concurrent invocations, so a single shared one would mix every teacher's
    # questions into one conversation and fail under simultaneous requests.
    agent = Agent(model=assistant_model, system_prompt=ASSISTANT_PERSONA,
                  tools=[search_curriculum], callback_handler=None)
    result = agent(_build_input(prompt, grade, subject, evidence))

    tool_calls = [
        block["toolUse"]["name"]
        for message in agent.messages if message["role"] == "assistant"
        for block in message["content"] if "toolUse" in block
    ]
    log.info("assistant answered with %d tool call(s): %s", len(tool_calls), tool_calls or "none")
    return {"answer": _to_plain_text(str(result)), "toolCalls": tool_calls}
