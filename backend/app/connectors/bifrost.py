"""Bifrost agent (VPS): containers, WireGuard, CrowdSec, updates pendentes."""
from __future__ import annotations

import asyncio

import httpx

from ..config import env
from .base import Connector


class Bifrost(Connector):
    name = "bifrost"
    interval = 60

    def __init__(self) -> None:
        self.url = env("BIFROST_AGENT_URL").rstrip("/")
        self.key = env("BIFROST_AGENT_KEY")

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.key)

    async def _get(self, client: httpx.AsyncClient, path: str):
        resp = await client.get(f"{self.url}{path}", headers={"X-Agent-Key": self.key})
        resp.raise_for_status()
        return resp.json()

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        status, peers, decisions, images = await asyncio.gather(
            self._get(client, "/status"),
            self._get(client, "/wireguard/peers"),
            self._get(client, "/crowdsec/decisions"),
            self._get(client, "/updates/images"),
            return_exceptions=True,
        )

        def safe(value, fallback):
            return fallback if isinstance(value, Exception) else value

        status = safe(status, {})
        peers = safe(peers, [])
        decisions = safe(decisions, [])
        images = safe(images, [])

        containers = status.get("containers") or []
        if isinstance(peers, dict):
            peers = peers.get("peers", [])
        if isinstance(decisions, dict):
            decisions = decisions.get("decisions", [])
        if isinstance(images, dict):
            images = images.get("images", [])

        updates_pending = [
            i for i in images
            if isinstance(i, dict) and (i.get("update_available") or i.get("outdated"))
        ]
        return {
            "containers_running": sum(
                1 for c in containers if "running" in str(c.get("status", "")).lower()
                or "up" in str(c.get("status", "")).lower()
            ),
            "containers_total": len(containers),
            "disk": status.get("disk_usage"),
            "wireguard_peers": peers,
            "crowdsec_bans": len(decisions),
            "recent_bans": decisions[:5] if isinstance(decisions, list) else [],
            "updates_pending": len(updates_pending),
        }
