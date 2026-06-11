"""Beszel (PocketBase): métricas de todas as máquinas com agente."""
from __future__ import annotations

import httpx

from ..config import env
from .base import Connector, num


class Beszel(Connector):
    name = "beszel"
    interval = 15

    def __init__(self) -> None:
        self.url = env("BESZEL_URL").rstrip("/")
        self.email = env("BESZEL_EMAIL")
        self.password = env("BESZEL_PASSWORD")
        self._token: str | None = None

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.email and self.password)

    async def _auth(self, client: httpx.AsyncClient) -> str:
        resp = await client.post(
            f"{self.url}/api/collections/users/auth-with-password",
            json={"identity": self.email, "password": self.password},
        )
        resp.raise_for_status()
        self._token = resp.json()["token"]
        return self._token

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        token = self._token or await self._auth(client)
        resp = await client.get(
            f"{self.url}/api/collections/systems/records",
            params={"perPage": 100, "sort": "name"},
            headers={"Authorization": token},
        )
        if resp.status_code in (401, 403):
            token = await self._auth(client)
            resp = await client.get(
                f"{self.url}/api/collections/systems/records",
                params={"perPage": 100, "sort": "name"},
                headers={"Authorization": token},
            )
        resp.raise_for_status()

        systems = []
        for rec in resp.json().get("items", []):
            info = rec.get("info") or {}
            systems.append(
                {
                    "name": rec.get("name"),
                    "status": rec.get("status"),
                    "cpu": num(info.get("cpu")),
                    # chaves curtas do beszel variam entre versões
                    "mem": num(info.get("mp", info.get("mpct"))),
                    "disk": num(info.get("dp", info.get("dpct"))),
                    "uptime": num(info.get("u")),
                    "agent_version": info.get("v"),
                }
            )
        return {"systems": systems}
