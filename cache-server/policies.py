"""Cache refresh policies based on event lifecycle."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from enum import Enum
from typing import Any


class EventPhase(str, Enum):
    FUTURE = "future"
    ACTIVE = "active"
    RECENT_END = "recent_end"  # ended < 2 days ago
    FROZEN = "frozen"  # ended >= 2 days ago — never refresh


@dataclass
class RefreshPolicy:
    phase: EventPhase
    refresh_interval_sec: int | None  # None = never refresh
    frozen: bool = False


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def classify_event(
    start_date: str | None,
    end_date: str | None,
    *,
    now: date | None = None,
) -> EventPhase:
    today = now or datetime.now(timezone.utc).date()
    start = _parse_date(start_date)
    end = _parse_date(end_date)

    if start and today < start:
        return EventPhase.FUTURE
    if end:
        days_since_end = (today - end).days
        if days_since_end >= 2:
            return EventPhase.FROZEN
        if days_since_end >= 0:
            return EventPhase.RECENT_END
    if start and end and start <= today <= end:
        return EventPhase.ACTIVE
    if start and today >= start:
        return EventPhase.RECENT_END
    return EventPhase.FUTURE


def active_refresh_interval(requests_last_hour: int) -> int:
    """More traffic → shorter refresh (5–30 min)."""
    from config import ACTIVE_MAX_REFRESH_SEC, ACTIVE_MIN_REFRESH_SEC

    # Each request in the last hour shaves 2.5 min off the max interval.
    reduction = requests_last_hour * 150
    interval = ACTIVE_MAX_REFRESH_SEC - reduction
    return max(ACTIVE_MIN_REFRESH_SEC, interval)


def policy_for_event(
    start_date: str | None,
    end_date: str | None,
    *,
    requests_last_hour: int = 0,
    now: date | None = None,
) -> RefreshPolicy:
    from config import FUTURE_REFRESH_SEC

    phase = classify_event(start_date, end_date, now=now)

    if phase == EventPhase.FROZEN:
        return RefreshPolicy(phase=phase, refresh_interval_sec=None, frozen=True)

    if phase == EventPhase.FUTURE:
        return RefreshPolicy(phase=phase, refresh_interval_sec=FUTURE_REFRESH_SEC)

    if phase in (EventPhase.ACTIVE, EventPhase.RECENT_END):
        return RefreshPolicy(
            phase=phase,
            refresh_interval_sec=active_refresh_interval(requests_last_hour),
        )

    return RefreshPolicy(phase=phase, refresh_interval_sec=FUTURE_REFRESH_SEC)


def policy_for_generic_key(cache_key: str, requests_last_hour: int = 0) -> RefreshPolicy:
    """Fallback for non-event keys (teams list, global stats, etc.)."""
    if cache_key.startswith("computed:global-stats:"):
        return RefreshPolicy(
            phase=EventPhase.ACTIVE,
            refresh_interval_sec=active_refresh_interval(requests_last_hour),
        )
    if cache_key.startswith("tba:teams:"):
        return RefreshPolicy(
            phase=EventPhase.FUTURE,
            refresh_interval_sec=7 * 24 * 60 * 60,
        )
    if cache_key.startswith("tba:events:"):
        return RefreshPolicy(
            phase=EventPhase.ACTIVE,
            refresh_interval_sec=6 * 60 * 60,
        )
    return RefreshPolicy(
        phase=EventPhase.ACTIVE,
        refresh_interval_sec=active_refresh_interval(requests_last_hour),
    )


def extract_event_dates_from_meta(meta: dict[str, Any] | None) -> tuple[str | None, str | None]:
    if not meta:
        return None, None
    return meta.get("start_date"), meta.get("end_date")
