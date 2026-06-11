"""Scrutiny (neverNAS): saúde SMART dos discos."""
from __future__ import annotations

import httpx

from ..config import env
from .base import Connector, num


class Scrutiny(Connector):
    name = "scrutiny"
    interval = 300  # SMART muda devagar

    def __init__(self) -> None:
        self.url = env("SCRUTINY_URL").rstrip("/")

    @property
    def enabled(self) -> bool:
        return bool(self.url)

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        resp = await client.get(f"{self.url}/api/summary")
        resp.raise_for_status()
        summary = (resp.json().get("data") or {}).get("summary") or {}
        disks = []
        for wwn, entry in summary.items():
            device = entry.get("device") or {}
            smart = entry.get("smart") or {}
            disks.append(
                {
                    "wwn": wwn,
                    "name": device.get("device_name"),
                    "model": device.get("model_name"),
                    "capacity": num(device.get("capacity")),
                    # 0 = passed; restantes bits = failed smart/scrutiny
                    "status": device.get("device_status"),
                    "temp": num(smart.get("temp")),
                    "power_on_hours": num(smart.get("power_on_hours")),
                }
            )
        disks.sort(key=lambda d: d["name"] or "")
        failed = [d["name"] for d in disks if d["status"] not in (0, None)]
        return {"disks": disks, "failed": failed}
