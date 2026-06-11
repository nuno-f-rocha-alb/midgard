"""Portainer: containers de todos os endpoints + stats (CPU/RAM) dos que estão
mapeados em services.yaml (campo `container`)."""
from __future__ import annotations

import asyncio

import httpx
import yaml

from ..config import SERVICES_FILE, env, env_bool
from .base import Connector, num


def _cpu_percent(stats: dict) -> float | None:
    cpu = stats.get("cpu_stats") or {}
    pre = stats.get("precpu_stats") or {}
    cpu_total = (cpu.get("cpu_usage") or {}).get("total_usage", 0)
    pre_total = (pre.get("cpu_usage") or {}).get("total_usage", 0)
    cpu_delta = cpu_total - pre_total
    sys_delta = (cpu.get("system_cpu_usage", 0) or 0) - (pre.get("system_cpu_usage", 0) or 0)
    ncpu = cpu.get("online_cpus") or len((cpu.get("cpu_usage") or {}).get("percpu_usage") or []) or 1
    if sys_delta > 0 and cpu_delta >= 0:
        return round(cpu_delta / sys_delta * ncpu * 100, 1)
    return 0.0


def _mem_percent(stats: dict) -> float | None:
    m = stats.get("memory_stats") or {}
    usage = num(m.get("usage")) or 0
    # descontar cache (igual ao `docker stats`)
    inactive = num((m.get("stats") or {}).get("inactive_file")) or 0
    used = max(usage - inactive, 0)
    limit = num(m.get("limit")) or 0
    return round(used / limit * 100, 1) if limit else None


class Portainer(Connector):
    name = "portainer"
    interval = 30

    def __init__(self) -> None:
        self.url = env("PORTAINER_URL").rstrip("/")
        self.api_key = env("PORTAINER_API_KEY")
        self.verify_tls = env_bool("PORTAINER_VERIFY_TLS", False)
        self.wanted = self._load_wanted()

    @staticmethod
    def _load_wanted() -> set[str]:
        """Nomes de containers referenciados nos tiles (campo `container`)."""
        if not SERVICES_FILE.exists():
            return set()
        raw = yaml.safe_load(SERVICES_FILE.read_text(encoding="utf-8")) or {}
        names = set()
        for group in raw.get("groups") or []:
            for svc in group.get("services") or []:
                if svc.get("container"):
                    names.add(svc["container"])
        return names

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.api_key)

    async def _stats(self, client: httpx.AsyncClient, ep_id, name: str) -> tuple[str, dict | None]:
        try:
            resp = await client.get(
                f"{self.url}/api/endpoints/{ep_id}/docker/containers/{name}/stats",
                params={"stream": "false"},
                headers={"X-API-Key": self.api_key},
            )
            resp.raise_for_status()
            s = resp.json()
            return name, {"cpu": _cpu_percent(s), "mem": _mem_percent(s)}
        except Exception:
            return name, None

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        headers = {"X-API-Key": self.api_key}
        resp = await client.get(f"{self.url}/api/endpoints", headers=headers)
        resp.raise_for_status()

        endpoints = []
        stats: dict[str, dict] = {}
        for ep in resp.json():
            ep_id, ep_name = ep.get("Id"), ep.get("Name")
            try:
                c_resp = await client.get(
                    f"{self.url}/api/endpoints/{ep_id}/docker/containers/json",
                    params={"all": "true"},
                    headers=headers,
                )
                c_resp.raise_for_status()
                containers = [
                    {
                        "name": (c.get("Names") or ["?"])[0].lstrip("/"),
                        "image": c.get("Image"),
                        "state": c.get("State"),
                        "status": c.get("Status"),
                    }
                    for c in c_resp.json()
                ]
            except Exception as exc:
                endpoints.append({"name": ep_name, "error": str(exc), "containers": []})
                continue

            # stats só dos containers a correr que estão mapeados em tiles
            targets = [c["name"] for c in containers if c["state"] == "running" and c["name"] in self.wanted]
            if targets:
                results = await asyncio.gather(*(self._stats(client, ep_id, n) for n in targets))
                for name, data in results:
                    if data:
                        stats[name] = data

            running = sum(1 for c in containers if c["state"] == "running")
            unhealthy = [c["name"] for c in containers if "unhealthy" in (c["status"] or "")]
            endpoints.append(
                {
                    "name": ep_name,
                    "total": len(containers),
                    "running": running,
                    "unhealthy": unhealthy,
                    "containers": sorted(containers, key=lambda c: c["name"]),
                }
            )
        return {"endpoints": endpoints, "stats": stats}
