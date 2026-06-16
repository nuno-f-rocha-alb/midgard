"""Karakeep (Hoarder): bookmarks de uma lista escolhida (read-only)."""
from __future__ import annotations

import httpx

from ..config import env
from .base import Connector


class Karakeep(Connector):
    name = "karakeep"
    interval = 120  # bookmarks mudam devagar

    def __init__(self) -> None:
        self.url = env("KARAKEEP_URL").rstrip("/")
        self.key = env("KARAKEEP_API_KEY")
        self.list_name = env("KARAKEEP_LIST")
        self._list_id: str | None = None

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.key and self.list_name)

    async def _resolve_list(self, client: httpx.AsyncClient) -> str:
        resp = await client.get(
            f"{self.url}/api/v1/lists", headers={"Authorization": f"Bearer {self.key}"}
        )
        resp.raise_for_status()
        wanted = self.list_name.strip().lower()
        for lst in resp.json().get("lists") or []:
            if (lst.get("name") or "").strip().lower() == wanted:
                self._list_id = lst.get("id")
                return self._list_id
        raise RuntimeError(f"lista '{self.list_name}' não encontrada no Karakeep")

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        headers = {"Authorization": f"Bearer {self.key}"}
        list_id = self._list_id or await self._resolve_list(client)
        url = f"{self.url}/api/v1/lists/{list_id}/bookmarks"
        resp = await client.get(url, params={"limit": 24}, headers=headers)
        if resp.status_code == 404:  # lista pode ter sido recriada com outro id
            list_id = await self._resolve_list(client)
            resp = await client.get(
                f"{self.url}/api/v1/lists/{list_id}/bookmarks",
                params={"limit": 24},
                headers=headers,
            )
        resp.raise_for_status()

        items = []
        for b in resp.json().get("bookmarks") or []:
            content = b.get("content") or {}
            link = content.get("url")
            items.append(
                {
                    "id": b.get("id"),
                    "title": b.get("title") or content.get("title") or link or "(sem título)",
                    # bookmarks de texto não têm url → abrir no próprio Karakeep
                    "url": link or f"{self.url}/dashboard/preview/{b.get('id')}",
                    "image": content.get("imageUrl"),
                    "favicon": content.get("favicon"),
                    "tags": [t.get("name") for t in (b.get("tags") or []) if t.get("name")][:3],
                }
            )
        return {"list": self.list_name, "bookmarks": items}
