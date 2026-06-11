"""Emby: sessões a tocar agora + contagens da biblioteca."""
from __future__ import annotations

import httpx

from ..config import env
from .base import Connector


class Emby(Connector):
    name = "emby"
    interval = 20

    def __init__(self) -> None:
        self.url = env("EMBY_URL").rstrip("/")
        self.api_key = env("EMBY_API_KEY")

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.api_key)

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        headers = {"X-Emby-Token": self.api_key}

        resp = await client.get(f"{self.url}/emby/Sessions", headers=headers)
        resp.raise_for_status()
        now_playing = []
        for s in resp.json():
            item = s.get("NowPlayingItem")
            if not item:
                continue
            title = item.get("Name")
            if item.get("SeriesName"):
                title = f"{item['SeriesName']} — {title}"
            now_playing.append(
                {
                    "user": s.get("UserName"),
                    "client": s.get("Client"),
                    "title": title,
                    "type": item.get("Type"),
                    "paused": (s.get("PlayState") or {}).get("IsPaused", False),
                }
            )

        counts = {}
        try:
            c_resp = await client.get(f"{self.url}/emby/Items/Counts", headers=headers)
            c_resp.raise_for_status()
            body = c_resp.json()
            counts = {
                "movies": body.get("MovieCount"),
                "series": body.get("SeriesCount"),
                "episodes": body.get("EpisodeCount"),
            }
        except Exception:
            pass

        return {"now_playing": now_playing, "counts": counts}
