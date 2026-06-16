"""Estado em memória + broadcast WebSocket."""
from __future__ import annotations

import asyncio
import json
import time

from fastapi import WebSocket


class Store:
    def __init__(self) -> None:
        self.data: dict[str, dict] = {}
        self.clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def snapshot(self) -> dict[str, dict]:
        async with self._lock:
            return dict(self.data)  # cópia rasa: não entregar o dict vivo

    async def update(self, name: str, payload: dict) -> None:
        message = json.dumps({"name": name, "payload": payload}, default=str)
        async with self._lock:
            self.data[name] = payload
            dead = []
            for ws in self.clients:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.clients.discard(ws)

    async def attach(self, ws: WebSocket) -> None:
        async with self._lock:
            self.clients.add(ws)

    async def detach(self, ws: WebSocket) -> None:
        async with self._lock:
            self.clients.discard(ws)


def ok(data: dict) -> dict:
    return {"ok": True, "ts": time.time(), "data": data}


def fail(error: str) -> dict:
    return {"ok": False, "ts": time.time(), "error": error}
