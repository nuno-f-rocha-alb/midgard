"""qBittorrent Web API: velocidades + contagem de torrents."""
from __future__ import annotations

import httpx

from ..config import env
from .base import Connector


class QBittorrent(Connector):
    name = "qbittorrent"
    interval = 15

    def __init__(self) -> None:
        self.url = env("QBIT_URL").rstrip("/")
        self.username = env("QBIT_USERNAME")
        self.password = env("QBIT_PASSWORD")
        self._cookie: str | None = None

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.username and self.password)

    async def _auth(self, client: httpx.AsyncClient) -> str:
        resp = await client.post(
            f"{self.url}/api/v2/auth/login",
            data={"username": self.username, "password": self.password},
            headers={"Referer": self.url},
        )
        resp.raise_for_status()
        sid = resp.cookies.get("SID")
        if not sid:
            raise RuntimeError("login no qBittorrent falhou (sem cookie SID)")
        self._cookie = sid
        return sid

    async def _get(self, client: httpx.AsyncClient, path: str):
        sid = self._cookie or await self._auth(client)
        resp = await client.get(f"{self.url}{path}", cookies={"SID": sid})
        if resp.status_code == 403:
            sid = await self._auth(client)
            resp = await client.get(f"{self.url}{path}", cookies={"SID": sid})
        resp.raise_for_status()
        return resp.json()

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        transfer = await self._get(client, "/api/v2/transfer/info")
        torrents = await self._get(client, "/api/v2/torrents/info")
        return {
            "dl_speed": transfer.get("dl_info_speed"),
            "up_speed": transfer.get("up_info_speed"),
            "total": len(torrents),
            "downloading": sum(1 for t in torrents if "DL" in (t.get("state") or "").upper()
                               or t.get("state") in ("downloading", "stalledDL", "metaDL")),
            "seeding": sum(1 for t in torrents if t.get("state") in ("uploading", "stalledUP")),
        }
