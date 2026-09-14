"""Unconditional markdown cleanup for model output shown as plain text.

Prompt instructions alone are not reliably followed, so every plain-text generation path runs
its output through `to_plain_text`.
"""
import re

# Order matters: horizontal rules go first, or "***" would pair with the next line's "**".
_MARKDOWN_RULES = [
    (re.compile(r"^\s*(\*{3,}|-{3,}|_{3,})\s*$", re.MULTILINE), ""),  # horizontal rules
    (re.compile(r"^\s{0,3}#{1,6}\s*", re.MULTILINE), ""),        # headings
    (re.compile(r"^(\s*)[*+]\s+", re.MULTILINE), r"\1- "),       # "* item" bullets
    (re.compile(r"(\*\*|__)(.+?)\1", re.DOTALL), r"\2"),         # bold
    (re.compile(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])"), r"\1"),  # italics
    (re.compile(r"`([^`]*)`"), r"\1"),                            # inline code
]


def to_plain_text(text: str) -> str:
    for pattern, replacement in _MARKDOWN_RULES:
        text = pattern.sub(replacement, text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()
