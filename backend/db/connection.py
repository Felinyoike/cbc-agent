"""Postgres connection pool and the single seeded demo user.

There is no login flow yet: every scheme is owned by the demo user seeded here.
"""
import logging
import os
from contextlib import contextmanager

from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

log = logging.getLogger("backend.db")

load_dotenv()

DEMO_USER_EMAIL = "demo.teacher@cbc.local"
DEMO_USER_NAME = "Ms. A. Wanjiru"

_pool: ThreadedConnectionPool | None = None
demo_user_id: str | None = None


def init_db() -> None:
    """Open the pool and seed the demo user. A missing or unreachable database is
    logged, not raised, so the curriculum endpoints keep working without Postgres."""
    global _pool, demo_user_id

    url = os.environ.get("DATABASE_URL")
    if not url:
        log.warning("DATABASE_URL is not set -- /api/schemes endpoints are unavailable.")
        return

    try:
        _pool = ThreadedConnectionPool(minconn=1, maxconn=10, dsn=url)
        with get_cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (DEMO_USER_EMAIL,))
            row = cur.fetchone()
            if row is None:
                cur.execute(
                    "INSERT INTO users (email, full_name, role) VALUES (%s, %s, 'teacher') RETURNING id",
                    (DEMO_USER_EMAIL, DEMO_USER_NAME),
                )
                row = cur.fetchone()
                log.info("Seeded demo user %s", row["id"])
            demo_user_id = str(row["id"])
    except Exception:
        log.exception("Postgres initialisation failed -- /api/schemes endpoints are unavailable.")
        if _pool is not None:
            _pool.closeall()
        _pool = None
        demo_user_id = None


def is_available() -> bool:
    return _pool is not None and demo_user_id is not None


@contextmanager
def get_cursor():
    """A dict cursor inside one transaction: committed on success, rolled back on error."""
    if _pool is None:
        raise RuntimeError("Database is not initialised")
    conn = _pool.getconn()
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                yield cur
    finally:
        _pool.putconn(conn)
