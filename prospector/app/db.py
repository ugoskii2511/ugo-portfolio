"""Postgres access (same database as the portfolio; Prisma owns the schema).

Connections are short-lived (one per request/step) because this runs as a
serverless function behind Supabase's transaction-mode pooler, which also
means server-side prepared statements must be disabled.
"""

from __future__ import annotations

import secrets
import string
import time
from contextlib import contextmanager
from typing import Any, Iterator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.config import config

Json = Jsonb  # re-export for callers building JSON parameters


class DatabaseNotConfigured(RuntimeError):
    pass


# Query options Prisma understands but libpq rejects ("invalid URI query
# parameter"). The portfolio's DATABASE_URL may include them.
_PRISMA_ONLY_PARAMS = {"pgbouncer", "connection_limit", "pool_timeout", "schema", "statement_cache_size", "socket_timeout"}


def libpq_url(url: str) -> str:
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k not in _PRISMA_ONLY_PARAMS]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    if not config.database_url:
        raise DatabaseNotConfigured("DATABASE_URL is not set")
    conn = psycopg.connect(
        libpq_url(config.database_url),
        row_factory=dict_row,
        prepare_threshold=None,
        connect_timeout=10,
        autocommit=False,
        # Job steps can hold a connection while fetching websites; keepalives
        # stop NAT gateways and poolers dropping it as idle.
        keepalives=1,
        keepalives_idle=15,
        keepalives_interval=5,
        keepalives_count=3,
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        if not conn.broken:
            conn.rollback()
        raise
    finally:
        conn.close()


def fetch_all(conn: psycopg.Connection, sql: str, params: Any = None) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return list(cur.fetchall())


def fetch_one(conn: psycopg.Connection, sql: str, params: Any = None) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def execute(conn: psycopg.Connection, sql: str, params: Any = None) -> int:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.rowcount


# cuid-like ids: Prisma generates these client-side, so rows inserted from
# Python need their own. Format: "c" + base36 time + random, 25 chars.
_ALPHABET = string.ascii_lowercase + string.digits


def new_id() -> str:
    millis = int(time.time() * 1000)
    stamp = ""
    while millis:
        millis, rem = divmod(millis, 36)
        stamp = _ALPHABET[rem] + stamp
    random_part = "".join(secrets.choice(_ALPHABET) for _ in range(24 - len(stamp)))
    return "c" + stamp + random_part
