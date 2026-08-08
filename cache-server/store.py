"""Persistent cache: SQLite index + gzipped JSON blobs on disk."""

from __future__ import annotations

import gzip
import hashlib
import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

from config import BLOBS_DIR, DB_PATH, DATA_DIR, MAX_BYTES


class CacheStore:
    def __init__(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        BLOBS_DIR.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        with self._conn:
            self._conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS cache_entries (
                    cache_key TEXT PRIMARY KEY,
                    blob_path TEXT NOT NULL,
                    size_bytes INTEGER NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    last_accessed REAL NOT NULL,
                    request_count INTEGER NOT NULL DEFAULT 0,
                    frozen INTEGER NOT NULL DEFAULT 0,
                    refresh_interval_sec INTEGER,
                    event_start TEXT,
                    event_end TEXT,
                    phase TEXT
                );

                CREATE TABLE IF NOT EXISTS request_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cache_key TEXT NOT NULL,
                    ts REAL NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_request_log_key_ts
                    ON request_log(cache_key, ts);

                CREATE INDEX IF NOT EXISTS idx_cache_updated
                    ON cache_entries(updated_at);

                CREATE TABLE IF NOT EXISTS events_meta (
                    event_key TEXT PRIMARY KEY,
                    year INTEGER,
                    name TEXT,
                    start_date TEXT,
                    end_date TEXT,
                    event_type INTEGER,
                    updated_at REAL NOT NULL
                );
                """
            )

    def _blob_path(self, cache_key: str) -> Path:
        digest = hashlib.sha256(cache_key.encode()).hexdigest()
        return BLOBS_DIR / f"{digest[:2]}" / f"{digest}.json.gz"

    def _write_blob(self, cache_key: str, payload: bytes) -> tuple[Path, int]:
        path = self._blob_path(cache_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
        return path, len(payload)

    def get(self, cache_key: str) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM cache_entries WHERE cache_key = ?", (cache_key,)
            ).fetchone()
            if not row:
                return None

            path = Path(row["blob_path"])
            if not path.exists():
                self._delete_row(cache_key)
                return None

            raw = gzip.decompress(path.read_bytes())
            now = time.time()
            self._conn.execute(
                "UPDATE cache_entries SET last_accessed = ? WHERE cache_key = ?",
                (now, cache_key),
            )
            self._conn.commit()

            return {
                "key": cache_key,
                "data": json.loads(raw.decode("utf-8")),
                "updated_at": row["updated_at"],
                "frozen": bool(row["frozen"]),
                "refresh_interval_sec": row["refresh_interval_sec"],
                "phase": row["phase"],
                "size_bytes": row["size_bytes"],
            }

    def put(
        self,
        cache_key: str,
        data: Any,
        *,
        frozen: bool = False,
        refresh_interval_sec: int | None = None,
        event_start: str | None = None,
        event_end: str | None = None,
        phase: str | None = None,
    ) -> None:
        payload = gzip.compress(
            json.dumps(data, separators=(",", ":")).encode("utf-8"), compresslevel=6
        )

        with self._lock:
            now = time.time()
            existing = self._conn.execute(
                "SELECT blob_path FROM cache_entries WHERE cache_key = ?",
                (cache_key,),
            ).fetchone()
            if existing:
                old_path = Path(existing["blob_path"])
                if old_path.exists() and old_path != self._blob_path(cache_key):
                    old_path.unlink(missing_ok=True)

            path, size = self._write_blob(cache_key, payload)

            self._conn.execute(
                """
                INSERT INTO cache_entries (
                    cache_key, blob_path, size_bytes, created_at, updated_at,
                    last_accessed, frozen, refresh_interval_sec,
                    event_start, event_end, phase
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                    blob_path = excluded.blob_path,
                    size_bytes = excluded.size_bytes,
                    updated_at = excluded.updated_at,
                    last_accessed = excluded.last_accessed,
                    frozen = excluded.frozen,
                    refresh_interval_sec = excluded.refresh_interval_sec,
                    event_start = excluded.event_start,
                    event_end = excluded.event_end,
                    phase = excluded.phase
                """,
                (
                    cache_key,
                    str(path),
                    size,
                    now,
                    now,
                    now,
                    1 if frozen else 0,
                    refresh_interval_sec,
                    event_start,
                    event_end,
                    phase,
                ),
            )
            self._conn.commit()
            self._enforce_size_limit()

    def record_request(self, cache_key: str) -> int:
        """Log a cache read; return requests in the last hour."""
        with self._lock:
            now = time.time()
            self._conn.execute(
                "INSERT INTO request_log (cache_key, ts) VALUES (?, ?)",
                (cache_key, now),
            )
            self._conn.execute(
                "UPDATE cache_entries SET request_count = request_count + 1 WHERE cache_key = ?",
                (cache_key,),
            )
            cutoff = now - 3600
            self._conn.execute("DELETE FROM request_log WHERE ts < ?", (cutoff,))
            row = self._conn.execute(
                "SELECT COUNT(*) AS c FROM request_log WHERE cache_key = ? AND ts >= ?",
                (cache_key, cutoff),
            ).fetchone()
            self._conn.commit()
            return int(row["c"]) if row else 0

    def requests_last_hour(self, cache_key: str) -> int:
        with self._lock:
            cutoff = time.time() - 3600
            row = self._conn.execute(
                "SELECT COUNT(*) AS c FROM request_log WHERE cache_key = ? AND ts >= ?",
                (cache_key, cutoff),
            ).fetchone()
            return int(row["c"]) if row else 0

    def get_many(
        self, keys: list[str], *, allow_stale: bool = False
    ) -> dict[str, dict[str, Any]]:
        if not keys:
            return {}
        with self._lock:
            unique = list(dict.fromkeys(keys))
            placeholders = ",".join("?" * len(unique))
            rows = self._conn.execute(
                f"SELECT * FROM cache_entries WHERE cache_key IN ({placeholders})",
                unique,
            ).fetchall()
            now = time.time()
            result: dict[str, dict[str, Any]] = {}
            for row in rows:
                cache_key = row["cache_key"]
                if not allow_stale and not row["frozen"]:
                    interval = row["refresh_interval_sec"]
                    if interval is not None and (now - row["updated_at"]) > interval:
                        continue
                path = Path(row["blob_path"])
                if not path.exists():
                    continue
                raw = gzip.decompress(path.read_bytes())
                result[cache_key] = {
                    "key": cache_key,
                    "data": json.loads(raw.decode("utf-8")),
                    "updated_at": row["updated_at"],
                    "frozen": bool(row["frozen"]),
                    "refresh_interval_sec": row["refresh_interval_sec"],
                    "phase": row["phase"],
                }
            return result

    def is_stale(self, cache_key: str) -> bool:
        with self._lock:
            row = self._conn.execute(
                "SELECT frozen, refresh_interval_sec, updated_at FROM cache_entries WHERE cache_key = ?",
                (cache_key,),
            ).fetchone()
            if not row:
                return True
            if row["frozen"]:
                return False
            interval = row["refresh_interval_sec"]
            if interval is None:
                return False
            return time.time() - row["updated_at"] > interval

    def upsert_event_meta(
        self,
        event_key: str,
        *,
        year: int | None,
        name: str | None,
        start_date: str | None,
        end_date: str | None,
        event_type: int | None,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO events_meta (event_key, year, name, start_date, end_date, event_type, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(event_key) DO UPDATE SET
                    year = excluded.year,
                    name = excluded.name,
                    start_date = excluded.start_date,
                    end_date = excluded.end_date,
                    event_type = excluded.event_type,
                    updated_at = excluded.updated_at
                """,
                (
                    event_key,
                    year,
                    name,
                    start_date,
                    end_date,
                    event_type,
                    time.time(),
                ),
            )
            self._conn.commit()

    def list_events_meta(self, year: int | None = None) -> list[dict[str, Any]]:
        with self._lock:
            if year is not None:
                rows = self._conn.execute(
                    "SELECT * FROM events_meta WHERE year = ? ORDER BY start_date",
                    (year,),
                ).fetchall()
            else:
                rows = self._conn.execute(
                    "SELECT * FROM events_meta ORDER BY start_date"
                ).fetchall()
            return [dict(r) for r in rows]

    def entries_needing_refresh(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT * FROM cache_entries
                WHERE frozen = 0
                  AND refresh_interval_sec IS NOT NULL
                  AND (updated_at + refresh_interval_sec) <= ?
                ORDER BY updated_at ASC
                LIMIT 50
                """,
                (time.time(),),
            ).fetchall()
            return [dict(r) for r in rows]

    def stats(self) -> dict[str, Any]:
        with self._lock:
            row = self._conn.execute(
                """
                SELECT
                    COUNT(*) AS entries,
                    COALESCE(SUM(size_bytes), 0) AS total_bytes,
                    SUM(CASE WHEN frozen = 1 THEN 1 ELSE 0 END) AS frozen_entries
                FROM cache_entries
                """
            ).fetchone()
            return {
                "entries": int(row["entries"]),
                "total_bytes": int(row["total_bytes"]),
                "frozen_entries": int(row["frozen_entries"] or 0),
                "max_bytes": MAX_BYTES,
            }

    def cleanup_orphans(self) -> int:
        removed = 0
        with self._lock:
            rows = self._conn.execute(
                "SELECT cache_key, blob_path FROM cache_entries"
            ).fetchall()
            for row in rows:
                if not Path(row["blob_path"]).exists():
                    self._delete_row(row["cache_key"])
                    removed += 1
            self._conn.commit()
        return removed

    def _delete_row(self, cache_key: str) -> None:
        row = self._conn.execute(
            "SELECT blob_path FROM cache_entries WHERE cache_key = ?",
            (cache_key,),
        ).fetchone()
        if row:
            Path(row["blob_path"]).unlink(missing_ok=True)
        self._conn.execute("DELETE FROM cache_entries WHERE cache_key = ?", (cache_key,))
        self._conn.execute("DELETE FROM request_log WHERE cache_key = ?", (cache_key,))

    def _enforce_size_limit(self) -> None:
        row = self._conn.execute(
            "SELECT COALESCE(SUM(size_bytes), 0) AS total FROM cache_entries"
        ).fetchone()
        total = int(row["total"]) if row else 0
        if total <= MAX_BYTES:
            return

        # Evict oldest non-frozen, least recently accessed entries.
        rows = self._conn.execute(
            """
            SELECT cache_key FROM cache_entries
            WHERE frozen = 0
            ORDER BY last_accessed ASC
            LIMIT 20
            """
        ).fetchall()
        for r in rows:
            self._delete_row(r["cache_key"])
            row = self._conn.execute(
                "SELECT COALESCE(SUM(size_bytes), 0) AS total FROM cache_entries"
            ).fetchone()
            if int(row["total"]) <= MAX_BYTES * 0.9:
                break
        self._conn.commit()
