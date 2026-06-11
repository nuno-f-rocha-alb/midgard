"""Crafty Controller v2 API: servidores Minecraft + jogadores online."""
from __future__ import annotations

import asyncio

import httpx

from ..config import env, env_bool
from .base import Connector


class Crafty(Connector):
    name = "crafty"
    interval = 30

    def __init__(self) -> None:
        self.url = env("CRAFTY_URL").rstrip("/")
        self.token = env("CRAFTY_TOKEN")
        self.verify_tls = env_bool("CRAFTY_VERIFY_TLS", False)

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.token)

    async def _stats(self, client: httpx.AsyncClient, server: dict) -> dict:
        sid = server.get("server_id")
        out = {"id": sid, "name": server.get("server_name"), "running": False}
        try:
            resp = await client.get(
                f"{self.url}/api/v2/servers/{sid}/stats",
                headers={"Authorization": f"Bearer {self.token}"},
            )
            resp.raise_for_status()
            stats = resp.json().get("data") or {}
            out.update(
                {
                    "running": bool(stats.get("running")),
                    "online": stats.get("online"),
                    "max_players": stats.get("max"),
                    "version": stats.get("version"),
                }
            )
        except Exception as exc:
            out["error"] = str(exc)
        return out

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        resp = await client.get(
            f"{self.url}/api/v2/servers",
            headers={"Authorization": f"Bearer {self.token}"},
        )
        resp.raise_for_status()
        servers = resp.json().get("data") or []
        stats = await asyncio.gather(*(self._stats(client, s) for s in servers))
        return {"servers": list(stats)}
