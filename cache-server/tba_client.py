"""Thin TBA API client."""

from __future__ import annotations

from typing import Any

import httpx

from config import TBA_API_KEY, TBA_BASE


class TbaClient:
    def __init__(self) -> None:
        if not TBA_API_KEY:
            raise RuntimeError("TBA_API_KEY is not set")
        self._client = httpx.Client(
            base_url=TBA_BASE,
            headers={"X-TBA-Auth-Key": TBA_API_KEY},
            timeout=60.0,
        )

    def get_json(self, path: str) -> Any:
        # path like /event/2026casj/matches (no leading /api/v3)
        path = path if path.startswith("/") else f"/{path}"
        resp = self._client.get(path)
        resp.raise_for_status()
        return resp.json()

    def close(self) -> None:
        self._client.close()
