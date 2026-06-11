"""Speedtest Tracker: último resultado."""
from __future__ import annotations

import httpx

from ..config import env
from .base import Connector, num


class SpeedtestTracker(Connector):
    name = "speedtest"
    interval = 300

    def __init__(self) -> None:
        self.url = env("SPEEDTEST_URL").rstrip("/")
        self.token = env("SPEEDTEST_TOKEN")

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.token)

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        resp = await client.get(
            f"{self.url}/api/v1/results/latest",
            headers={"Authorization": f"Bearer {self.token}", "Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json().get("data") or {}

        def mbps(key_bits: str, key_bytes: str):
            bits = num(data.get(key_bits))
            if bits is not None:
                return round(bits / 1e6, 1)
            raw = num(data.get(key_bytes))
            return round(raw * 8 / 1e6, 1) if raw is not None else None

        return {
            "download_mbps": mbps("download_bits", "download"),
            "upload_mbps": mbps("upload_bits", "upload"),
            "ping_ms": num(data.get("ping")),
            "created_at": data.get("created_at"),
        }
