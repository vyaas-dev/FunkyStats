"""FSM persistent cache server."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config import HOST, PORT
from policies import EventPhase, classify_event, policy_for_event, policy_for_generic_key
from refresh_worker import RefreshWorker
from store import CacheStore
from tba_client import TbaClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
log = logging.getLogger("cache-server")

store = CacheStore()
tba: TbaClient | None = None
worker: RefreshWorker | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global tba, worker
    try:
        tba = TbaClient()
        worker = RefreshWorker(store, tba)
        worker.start()
    except Exception as exc:
        log.warning("TBA client unavailable (%s); cache-only mode", exc)
        tba = None
        worker = None
    yield
    if worker:
        worker.stop()
    if tba:
        tba.close()


app = FastAPI(title="FSM Cache Server", version="1.0.0", lifespan=lifespan)


class PutBody(BaseModel):
    data: Any
    event_start: str | None = None
    event_end: str | None = None
    force_frozen: bool = False


class MgetBody(BaseModel):
    keys: list[str]
    allow_stale: bool = False


def _policy_for_put(
    cache_key: str,
    body: PutBody,
    requests_last_hour: int,
) -> tuple[bool, int | None, str]:
    if body.force_frozen:
        return True, None, EventPhase.FROZEN.value

    start, end = body.event_start, body.event_end
    if cache_key.startswith("tba:event:") or cache_key.startswith("computed:event-teams:"):
        if not start or not end:
            parts = cache_key.split(":")
            event_key = parts[2] if len(parts) > 2 else None
            if event_key:
                for ev in store.list_events_meta():
                    if ev["event_key"] == event_key:
                        start = start or ev.get("start_date")
                        end = end or ev.get("end_date")
                        break
        policy = policy_for_event(start, end, requests_last_hour=requests_last_hour)
        return policy.frozen, policy.refresh_interval_sec, policy.phase.value

    policy = policy_for_generic_key(cache_key, requests_last_hour)
    return policy.frozen, policy.refresh_interval_sec, policy.phase.value


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "tba": "connected" if tba else "cache-only"}


@app.get("/v1/stats")
def stats() -> dict[str, Any]:
    return store.stats()


@app.get("/v1/cache/{cache_key:path}")
def get_cache(
    cache_key: str,
    allow_stale: bool = Query(False, description="Return stale entries instead of 404"),
) -> JSONResponse:
    store.record_request(cache_key)
    entry = store.get(cache_key)
    if not entry:
        raise HTTPException(status_code=404, detail="cache miss")

    stale = store.is_stale(cache_key)
    if stale and not allow_stale:
        raise HTTPException(status_code=404, detail="cache stale")

    return JSONResponse(
        {
            "key": entry["key"],
            "data": entry["data"],
            "updated_at": entry["updated_at"],
            "stale": stale,
            "frozen": entry["frozen"],
            "phase": entry["phase"],
        }
    )


@app.post("/v1/cache/mget")
def mget_cache(body: MgetBody) -> dict[str, Any]:
    if len(body.keys) > 500:
        raise HTTPException(status_code=400, detail="max 500 keys per request")
    entries = store.get_many(body.keys, allow_stale=body.allow_stale)
    return {"entries": entries, "found": len(entries)}


@app.put("/v1/cache/{cache_key:path}")
def put_cache(cache_key: str, body: PutBody) -> dict[str, Any]:
    reqs = store.requests_last_hour(cache_key)
    frozen, interval, phase = _policy_for_put(cache_key, body, reqs)
    store.put(
        cache_key,
        body.data,
        frozen=frozen,
        refresh_interval_sec=interval,
        event_start=body.event_start,
        event_end=body.event_end,
        phase=phase,
    )
    return {"ok": True, "frozen": frozen, "refresh_interval_sec": interval, "phase": phase}


@app.get("/v1/tba/{path:path}")
def tba_proxy(path: str) -> Any:
    """Fetch from TBA with persistent cache. Path mirrors TBA API (no /api/v3 prefix)."""
    if not tba:
        raise HTTPException(status_code=503, detail="TBA client not configured")

    cache_key = f"tba:{path.replace('/', ':')}"
    store.record_request(cache_key)

    entry = store.get(cache_key)
    if entry and not store.is_stale(cache_key):
        return entry["data"]

    data = tba.get_json(f"/{path}")

    # Derive event dates for event-scoped paths
    event_start = event_end = None
    parts = path.split("/")
    if len(parts) >= 2 and parts[0] == "event":
        event_key = parts[1]
        meta = next(
            (ev for ev in store.list_events_meta() if ev["event_key"] == event_key),
            None,
        )
        if meta:
            event_start = meta.get("start_date")
            event_end = meta.get("end_date")

    body = PutBody(data=data, event_start=event_start, event_end=event_end)
    reqs = store.requests_last_hour(cache_key)
    frozen, interval, phase = _policy_for_put(cache_key, body, reqs)
    store.put(
        cache_key,
        data,
        frozen=frozen,
        refresh_interval_sec=interval,
        event_start=event_start,
        event_end=event_end,
        phase=phase,
    )
    return data


@app.post("/v1/cleanup")
def cleanup() -> dict[str, int]:
    removed = store.cleanup_orphans()
    return {"orphans_removed": removed}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=HOST, port=PORT, reload=False)
