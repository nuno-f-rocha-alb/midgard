"""Pi-hole v6 API: resumo de queries/bloqueios."""
from __future__ import annotations

import httpx

from ..config import env
from .base import Connector


class PiHole(Connector):
    name = "pihole"
    interval = 30

    def __init__(self) -> None:
        self.url = env("PIHOLE_URL").rstrip("/")
        self.password = env("PIHOLE_PASSWORD")
        self._sid: str | None = None

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.password)

    async def _auth(self, client: httpx.AsyncClient) -> str:
        resp = await client.post(f"{self.url}/api/auth", json={"password": self.password})
        resp.raise_for_status()
        self._sid = resp.json()["session"]["sid"]
        return self._sid

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        sid = self._sid or await self._auth(client)
        resp = await client.get(f"{self.url}/api/stats/summary", headers={"X-FTL-SID": sid})
        if resp.status_code == 401:
            sid = await self._auth(client)
            resp = await client.get(f"{self.url}/api/stats/summary", headers={"X-FTL-SID": sid})
        resp.raise_for_status()
        body = resp.json()
        queries = body.get("queries") or {}
        return {
            "total_queries": queries.get("total"),
            "blocked": queries.get("blocked"),
            "percent_blocked": queries.get("percent_blocked"),
            "domains_on_list": (body.get("gravity") or {}).get("domains_being_blocked"),
            "active_clients": (body.get("clients") or {}).get("active"),
        }
