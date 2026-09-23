"""Retry for the model provider's temporary "busy" errors.

Gemini answers 503 UNAVAILABLE ("This model is currently experiencing high demand") during
load spikes, and they usually pass within seconds. Every call to the model -- generation,
the planning assistant, and embeddings for search and ingest -- goes through retry_transient,
so a teacher is not shown an error for a spike a short wait would have ridden out.

Only "busy" errors are retried. Anything else (a bad key, a quota limit, a malformed request,
a refused prompt) fails at once: retrying would not change the answer, only delay it.
"""
import logging
import re
import time
from typing import Callable, TypeVar

log = logging.getLogger("backend.retry")

T = TypeVar("T")

# Seconds to wait before each retry: four attempts in all, about 17 seconds at most.
RETRY_DELAYS = (2, 5, 10)

# Gemini: "503 UNAVAILABLE" / "503 Service Unavailable". Bedrock: ServiceUnavailableException.
# UNAVAILABLE is Gemini's upper-case status word; lower-case "unavailable" also appears in
# permanent errors ("model is unavailable in your region"), so it is not matched.
_BUSY = re.compile(r"\b503\b|\bUNAVAILABLE\b|ServiceUnavailable|(?i:overloaded|high demand)")


class ServiceBusyError(RuntimeError):
    """The provider was still busy after every retry."""


def is_transient(exc: BaseException) -> bool:
    """True for a provider "busy" error, including one wrapped by another library
    (Strands re-raises Gemini's errors, keeping the original as the cause)."""
    seen = set()
    while exc is not None and id(exc) not in seen:
        seen.add(id(exc))
        if getattr(exc, "code", None) == 503 or getattr(exc, "status_code", None) == 503:
            return True
        if _BUSY.search(f"{type(exc).__name__}: {exc}"):
            return True
        exc = exc.__cause__ or exc.__context__
    return False


def retry_transient(fn: Callable[[], T], what: str, delays=RETRY_DELAYS) -> T:
    """Call fn(), retrying after each delay while it fails with a "busy" error.

    fn must be safe to call again from scratch: build any per-request state (an Agent
    and its message history, say) inside it, not outside.
    """
    for attempt, delay in enumerate((*delays, None), start=1):
        try:
            return fn()
        except Exception as exc:
            if not is_transient(exc):
                raise
            if delay is None:
                raise ServiceBusyError(
                    f"The AI service is busy right now (it reported high demand) and did not "
                    f"recover after {attempt} attempts. Please try again in a minute."
                ) from exc
            log.warning("%s: provider busy (attempt %d of %d), retrying in %ss: %s",
                        what, attempt, len(delays) + 1, delay, str(exc)[:160])
            time.sleep(delay)
    raise AssertionError("unreachable")
