"""Background refresh loop for cached TBA + computed entries."""

from __future__ import annotations

import logging
import threading
import time
from typing import TYPE_CHECKING, Any

from config import CACHE_YEARS, REFRESH_ENABLED
from policies import EventPhase, classify_event, policy_for_event, policy_for_generic_key

if TYPE_CHECKING:
    from store import CacheStore
    from tba_client import TbaClient

log = logging.getLogger("refresh")


class RefreshWorker:
    def __init__(self, store: "CacheStore", tba: "TbaClient") -> None:
        self.store = store
        self.tba = tba
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if not REFRESH_ENABLED:
            log.info("Refresh worker disabled")
            return
        self._thread = threading.Thread(target=self._run, daemon=True, name="refresh-worker")
        self._thread.start()
        log.info("Refresh worker started")

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    def _run(self) -> None:
        # Initial event catalog sync
        try:
            self.sync_event_catalog()
        except Exception:
            log.exception("Initial event catalog sync failed")

        while not self._stop.is_set():
            try:
                self._refresh_due_entries()
                self.sync_event_catalog()
                self.store.cleanup_orphans()
            except Exception:
                log.exception("Refresh cycle error")
            self._stop.wait(60)

    def sync_event_catalog(self) -> None:
        for year in CACHE_YEARS:
            cache_key = f"tba:events:{year}:simple"
            try:
                events = self.tba.get_json(f"/events/{year}/simple")
            except Exception:
                log.warning("Failed to sync events for %s", year)
                continue

            reqs = self.store.requests_last_hour(cache_key)
            policy = policy_for_generic_key(cache_key, reqs)
            self.store.put(
                cache_key,
                events,
                frozen=False,
                refresh_interval_sec=policy.refresh_interval_sec,
                phase=policy.phase.value,
            )

            for ev in events:
                key = ev.get("key")
                if not key:
                    continue
                self.store.upsert_event_meta(
                    key,
                    year=year,
                    name=ev.get("name"),
                    start_date=ev.get("start_date"),
                    end_date=ev.get("end_date"),
                    event_type=ev.get("event_type"),
                )

                phase = classify_event(ev.get("start_date"), ev.get("end_date"))
                if phase == EventPhase.FROZEN:
                    self._mark_event_frozen(key)

    def _mark_event_frozen(self, event_key: str) -> None:
        for suffix in ("matches", "teams", "rankings"):
            ck = f"tba:event:{event_key}:{suffix}"
            entry = self.store.get(ck)
            if entry:
                self.store.put(
                    ck,
                    entry["data"],
                    frozen=True,
                    refresh_interval_sec=None,
                    phase=EventPhase.FROZEN.value,
                    event_start=entry.get("event_start"),
                    event_end=entry.get("event_end"),
                )

        ck = f"computed:event-teams:{event_key}"
        entry = self.store.get(ck)
        if entry:
            self.store.put(
                ck,
                entry["data"],
                frozen=True,
                refresh_interval_sec=None,
                phase=EventPhase.FROZEN.value,
            )

    def _refresh_due_entries(self) -> None:
        due = self.store.entries_needing_refresh()
        for row in due:
            if self._stop.is_set():
                break
            key = row["cache_key"]
            try:
                self._refresh_key(key, row)
            except Exception:
                log.warning("Failed to refresh %s", key, exc_info=True)

    def _refresh_key(self, cache_key: str, row: dict[str, Any]) -> None:
        if cache_key.startswith("tba:event:"):
            # tba:event:2026casj:matches
            parts = cache_key.split(":")
            if len(parts) < 4:
                return
            event_key, resource = parts[2], parts[3]
            meta = self._event_meta(event_key)
            reqs = self.store.requests_last_hour(cache_key)
            policy = policy_for_event(
                meta.get("start_date"),
                meta.get("end_date"),
                requests_last_hour=reqs,
            )
            if policy.frozen:
                self._mark_event_frozen(event_key)
                return

            data = self.tba.get_json(f"/event/{event_key}/{resource}")
            self.store.put(
                cache_key,
                data,
                frozen=False,
                refresh_interval_sec=policy.refresh_interval_sec,
                event_start=meta.get("start_date"),
                event_end=meta.get("end_date"),
                phase=policy.phase.value,
            )
            return

        if cache_key.startswith("tba:events:"):
            year = cache_key.split(":")[-2]
            data = self.tba.get_json(f"/events/{year}/simple")
            policy = policy_for_generic_key(cache_key)
            self.store.put(
                cache_key,
                data,
                frozen=False,
                refresh_interval_sec=policy.refresh_interval_sec,
                phase=policy.phase.value,
            )
            return

        if cache_key.startswith("tba:teams:"):
            # tba:teams:2026:3:simple
            parts = cache_key.split(":")
            if len(parts) < 5:
                return
            year, page = parts[2], parts[3]
            data = self.tba.get_json(f"/teams/{year}/{page}/simple")
            policy = policy_for_generic_key(cache_key)
            self.store.put(
                cache_key,
                data,
                frozen=False,
                refresh_interval_sec=policy.refresh_interval_sec,
                phase=policy.phase.value,
            )

    def _event_meta(self, event_key: str) -> dict[str, Any]:
        for ev in self.store.list_events_meta():
            if ev["event_key"] == event_key:
                return ev
        try:
            data = self.tba.get_json(f"/event/{event_key}")
            self.store.upsert_event_meta(
                event_key,
                year=int(event_key[:4]) if event_key[:4].isdigit() else None,
                name=data.get("name"),
                start_date=data.get("start_date"),
                end_date=data.get("end_date"),
                event_type=data.get("event_type"),
            )
            return {
                "start_date": data.get("start_date"),
                "end_date": data.get("end_date"),
            }
        except Exception:
            return {}
