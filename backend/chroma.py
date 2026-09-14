"""Single shared handle on the ingested KICD curriculum collection.

The store lives at the project root, so the backend must be started from
`cbc-agent/` (see README / start command), not from inside `backend/`.
"""
import logging
import os

# Verify TLS against the OS certificate store instead of httpx's bundled certifi
# list. Antivirus HTTPS scanning (e.g. Avast Web/Mail Shield) re-signs Google's
# certificate with a root that only the OS trusts, which otherwise makes every
# Gemini embedding call fail with CERTIFICATE_VERIFY_FAILED. Must run before
# google-genai (and its httpx client) is imported.
try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

import chromadb
from dotenv import load_dotenv

# NOTE: the top-level store only. There is a nested `kicd_chroma_db/kicd_chroma_db/`
# on disk which is a stale byte-for-byte copy from an old mistake -- never touch it.
CHROMA_DB_PATH = "kicd_chroma_db"
COLLECTION_NAME = "kicd_curriculum"

log = logging.getLogger("backend.chroma")

load_dotenv()

_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

# Semantic search needs the same embedding function the data was ingested with.
# Pure metadata browsing (collection.get) does not, so a missing key degrades
# only the `query` path rather than taking the whole API down.
SEMANTIC_AVAILABLE = bool(os.environ.get("GEMINI_API_KEY"))

if SEMANTIC_AVAILABLE:
    # Imported lazily: gemini_embedding raises at import time without a key, and
    # the metadata-filter path must keep working when Gemini is unconfigured.
    from gemini_embedding import GeminiEmbeddingFunction

    collection = _client.get_collection(
        COLLECTION_NAME,
        embedding_function=GeminiEmbeddingFunction(),
    )
else:
    log.warning(
        "GEMINI_API_KEY is not set -- semantic search (POST /api/curriculum/search "
        "with a `query`) is unavailable. Metadata filter browsing still works."
    )
    collection = _client.get_collection(COLLECTION_NAME)

log.info("Chroma collection %r loaded with %d chunk(s)", COLLECTION_NAME, collection.count())
print(f"[chroma] collection '{COLLECTION_NAME}' loaded: {collection.count()} chunk(s) "
      f"(semantic search {'enabled' if SEMANTIC_AVAILABLE else 'DISABLED - no GEMINI_API_KEY'})")
