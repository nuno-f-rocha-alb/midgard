"""Proxmox VE: nós standalone (pve1, pve2), VMs e LXCs via API tokens."""
from __future__ import annotations

import asyncio

import httpx

from ..config import env, env_bool
from .base import Connector, num


class Proxmox(Connector):
    name = "proxmox"
    interval = 30

    def __init__(self) -> None:
        # PROXMOX_NODES=nome|url|user@realm!tokenid|secret,...
        self.nodes: list[dict] = []
        raw = env("PROXMOX_NODES")
        for entry in filter(None, (e.strip() for e in raw.split(","))):
            parts = entry.split("|")
            if len(parts) == 4:
                self.nodes.append(
                    {"name": parts[0], "url": parts[1].rstrip("/"), "token": f"{parts[2]}={parts[3]}"}
                )
        self.verify_tls = env_bool("PROXMOX_VERIFY_TLS", False)

    @property
    def enabled(self) -> bool:
        return bool(self.nodes)

    async def _fetch_node(self, client: httpx.AsyncClient, node: dict) -> dict:
        headers = {"Authorization": f"PVEAPIToken={node['token']}"}
        base = f"{node['url']}/api2/json"
        try:
            resp = await client.get(f"{base}/nodes", headers=headers)
            resp.raise_for_status()
            info = (resp.json().get("data") or [{}])[0]
            node_name = info.get("node", node["name"])

            guests = []
            for kind in ("qemu", "lxc"):
                g_resp = await client.get(f"{base}/nodes/{node_name}/{kind}", headers=headers)
                g_resp.raise_for_status()
                for g in g_resp.json().get("data") or []:
                    guests.append(
                        {
                            "vmid": g.get("vmid"),
                            "name": g.get("name"),
                            "type": kind,
                            "status": g.get("status"),
                            "cpu": num(g.get("cpu")),
                            "mem": num(g.get("mem")),
                            "maxmem": num(g.get("maxmem")),
                            "uptime": num(g.get("uptime")),
                        }
                    )
            guests.sort(key=lambda g: (g["status"] != "running", g["vmid"] or 0))
            maxmem = num(info.get("maxmem")) or 0
            return {
                "name": node["name"],
                "online": True,
                "cpu": round((num(info.get("cpu")) or 0) * 100, 1),
                "mem": round((num(info.get("mem")) or 0) / maxmem * 100, 1) if maxmem else None,
                "uptime": num(info.get("uptime")),
                "guests": guests,
                "running": sum(1 for g in guests if g["status"] == "running"),
                "total": len(guests),
            }
        except Exception as exc:
            return {"name": node["name"], "online": False, "error": str(exc), "guests": []}

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        results = await asyncio.gather(*(self._fetch_node(client, n) for n in self.nodes))
        return {"nodes": list(results)}
