"""Portainer: containers de todos os endpoints geridos."""
from __future__ import annotations

import httpx

from ..config import env, env_bool
from .base import Connector


class Portainer(Connector):
    name = "portainer"
    interval = 30

    def __init__(self) -> None:
        self.url = env("PORTAINER_URL").rstrip("/")
        self.api_key = env("PORTAINER_API_KEY")
        self.verify_tls = env_bool("PORTAINER_VERIFY_TLS", False)

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.api_key)

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        headers = {"X-API-Key": self.api_key}
        resp = await client.get(f"{self.url}/api/endpoints", headers=headers)
        resp.raise_for_status()

        endpoints = []
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
                containers = []
                endpoints.append({"name": ep_name, "error": str(exc), "containers": []})
                continue
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
        return {"endpoints": endpoints}
