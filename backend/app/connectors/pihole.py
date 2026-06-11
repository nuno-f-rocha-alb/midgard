"""Pi-hole: resumo de queries/bloqueios. Auto-deteta v6 (API REST) ou v5 (api.php)."""
from __future__ import annotations

import hashlib

import httpx

from ..config import env
from .base import Connector, num


class PiHole(Connector):
    name = "pihole"
    interval = 30

    def __init__(self) -> None:
        self.url = env("PIHOLE_URL").rstrip("/")
        self.password = env("PIHOLE_PASSWORD")
        self._sid: str | None = None
        self._version: int | None = None  # 6 ou 5, fixado após a 1ª deteção

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.password)

    # ── v6: sessão via /api/auth + X-FTL-SID ──────────────────────────────
    async def _v6(self, client: httpx.AsyncClient, _retry: bool = True) -> dict:
        if not self._sid:
            r = await client.post(f"{self.url}/api/auth", json={"password": self.password})
            r.raise_for_status()
            self._sid = r.json()["session"]["sid"]
        resp = await client.get(f"{self.url}/api/stats/summary", headers={"X-FTL-SID": self._sid})
        if resp.status_code == 401 and _retry:
            self._sid = None
            return await self._v6(client, _retry=False)
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

    # ── v5: token = double-sha256 da password (= WEBPASSWORD) ─────────────
    async def _v5(self, client: httpx.AsyncClient) -> dict:
        token = hashlib.sha256(
            hashlib.sha256(self.password.encode()).hexdigest().encode()
        ).hexdigest()
        resp = await client.get(
            f"{self.url}/admin/api.php", params={"summaryRaw": "", "auth": token}
        )
        resp.raise_for_status()
        body = resp.json()
        # v5 devolve [] quando o token é inválido
        if isinstance(body, list) or not body:
            raise RuntimeError("auth Pi-hole v5 falhou — confirma a PIHOLE_PASSWORD")
        return {
            "total_queries": num(body.get("dns_queries_today")),
            "blocked": num(body.get("ads_blocked_today")),
            "percent_blocked": num(body.get("ads_percentage_today")),
            "domains_on_list": num(body.get("domains_being_blocked")),
            "active_clients": num(body.get("unique_clients")),
        }

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        if self._version == 5:
            return await self._v5(client)
        try:
            data = await self._v6(client)
            self._version = 6
            return data
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                self._version = 5
                return await self._v5(client)
            raise
