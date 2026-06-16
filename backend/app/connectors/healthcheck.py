"""Health checks HTTP dos serviços definidos em config/services.yaml."""
from __future__ import annotations

import asyncio
import logging
import time

import httpx
import yaml

from ..config import SERVICES_FILE, env_bool
from .base import Connector

log = logging.getLogger("midgard")


class HealthCheck(Connector):
    name = "services"
    interval = 30
    verify_tls = False  # muitos serviços LAN têm TLS self-signed

    def __init__(self) -> None:
        self.groups: list[dict] = []
        if SERVICES_FILE.exists():
            try:
                raw = yaml.safe_load(SERVICES_FILE.read_text(encoding="utf-8")) or {}
            except yaml.YAMLError as exc:
                log.error("services.yaml inválido, a ignorar: %s", exc)
                raw = {}
            self.groups = raw.get("groups") or []

    @property
    def enabled(self) -> bool:
        return bool(self.groups)

    async def _check(self, client: httpx.AsyncClient, svc: dict) -> dict:
        url = svc.get("check") or svc.get("url")
        out = {
            "name": svc.get("name"),
            "url": svc.get("url"),
            "icon": svc.get("icon"),
            "container": svc.get("container"),
            "status": "unknown",
            "latency_ms": None,
        }
        if not url:
            return out
        start = time.monotonic()
        try:
            resp = await client.get(url, follow_redirects=True)
            out["latency_ms"] = round((time.monotonic() - start) * 1000)
            # 2xx-4xx conta como vivo (401/403 = serviço up, só pede auth)
            out["status"] = "up" if resp.status_code < 500 else "down"
        except Exception:
            out["latency_ms"] = round((time.monotonic() - start) * 1000)
            out["status"] = "down"
        return out

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        groups_out = []
        for group in self.groups:
            services = group.get("services") or []
            checks = await asyncio.gather(*(self._check(client, s) for s in services))
            groups_out.append({"name": group.get("name"), "services": list(checks)})
        return {"groups": groups_out}
