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

    async def _opt(self, client: httpx.AsyncClient, path: str):
        """Endpoints auxiliares: podem falhar isoladamente (ex.: WG indisponível,
        bouncer do CrowdSec não configurado) sem deitar abaixo o cartão todo."""
        try:
            return await self._get(client, path), None
        except Exception as exc:
            return None, str(exc)

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        # /status é o core: se falhar, propaga (o widget passa a mostrar o erro
        # real — auth/ligação — em vez de fingir zeros).
        status = await self._get(client, "/status")

        (peers, peers_err), (decisions, dec_err), (images, img_err) = await asyncio.gather(
            self._opt(client, "/wireguard/peers"),
            self._opt(client, "/crowdsec/decisions"),
            self._opt(client, "/updates/images"),
        )

        containers = status.get("containers") or []
        running = sum(
            1
            for c in containers
            if (s := str(c.get("status", "")).lower()) == "running" or s.startswith("up")
        )

        peer_list = peers.get("peers", []) if isinstance(peers, dict) else (peers or [])

        # /crowdsec/decisions → {page, limit, total, items:[...]}
        bans_total = decisions.get("total") if isinstance(decisions, dict) else None
        recent = (decisions.get("items") or [])[:5] if isinstance(decisions, dict) else []

        # /updates/images → lista de dicts com update_available
        img_list = images if isinstance(images, list) else []
        updates_pending = sum(
            1 for i in img_list if isinstance(i, dict) and i.get("update_available")
        )

        warnings = [
            w
            for w in (
                f"wireguard: {peers_err}" if peers_err else None,
                f"crowdsec: {dec_err}" if dec_err else None,
                f"updates: {img_err}" if img_err else None,
            )
            if w
        ]

        return {
            "containers_running": running,
            "containers_total": len(containers),
            "disk": status.get("disk_usage"),
            "wireguard_peers": peer_list,
            "crowdsec_bans": bans_total,
            "recent_bans": recent,
            "updates_pending": updates_pending,
            "warnings": warnings,
        }
