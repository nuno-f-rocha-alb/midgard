"""OpenWrt (GL.iNet, Asus): ubus via HTTP JSON-RPC, o mesmo endpoint da LuCI."""
from __future__ import annotations

import asyncio

import httpx

from ..config import env
from .base import Connector

NULL_SESSION = "00000000000000000000000000000000"


class OpenWrt(Connector):
    name = "openwrt"
    interval = 30
    verify_tls = False

    def __init__(self) -> None:
        # OPENWRT_ROUTERS=nome|url|user|password,...
        self.routers: list[dict] = []
        for entry in filter(None, (e.strip() for e in env("OPENWRT_ROUTERS").split(","))):
            parts = entry.split("|")
            if len(parts) == 4:
                self.routers.append(
                    {"name": parts[0], "url": parts[1].rstrip("/"), "user": parts[2], "password": parts[3]}
                )
        self._sessions: dict[str, str] = {}

    @property
    def enabled(self) -> bool:
        return bool(self.routers)

    async def _rpc(self, client: httpx.AsyncClient, url: str, params: list):
        resp = await client.post(
            f"{url}/ubus",
            json={"jsonrpc": "2.0", "id": 1, "method": "call", "params": params},
        )
        # GL.iNet (firmware 4.x) redireciona /ubus — não expõe a API ubus da LuCI
        if resp.is_redirect:
            raise RuntimeError("/ubus indisponível (redirect) — ativa a LuCI no router e usa o IP")
        resp.raise_for_status()
        return resp.json()

    async def _login(self, client: httpx.AsyncClient, r: dict) -> str:
        body = await self._rpc(
            client, r["url"],
            [NULL_SESSION, "session", "login",
             {"username": r["user"], "password": r["password"], "timeout": 900}],
        )
        result = body.get("result")
        if not isinstance(result, list) or len(result) < 2 or result[0] != 0:
            raise RuntimeError(f"login ubus falhou em {r['name']}")
        if not isinstance(result[1], dict) or "ubus_rpc_session" not in result[1]:
            raise RuntimeError(f"login ubus: resposta inesperada de {r['name']}")
        sid = result[1]["ubus_rpc_session"]
        self._sessions[r["name"]] = sid
        return sid

    async def _call(self, client: httpx.AsyncClient, r: dict, obj: str, method: str,
                    params: dict | None = None, _retry: bool = True):
        sid = self._sessions.get(r["name"]) or await self._login(client, r)
        body = await self._rpc(client, r["url"], [sid, obj, method, params or {}])
        result = body.get("result")
        # 6 = permission denied — tipicamente sessão expirada; renovar uma vez
        if isinstance(result, list) and result[0] == 6 and _retry:
            self._sessions.pop(r["name"], None)
            return await self._call(client, r, obj, method, params, _retry=False)
        if not isinstance(result, list) or result[0] != 0:
            raise RuntimeError(f"ubus {obj}.{method} falhou: {body.get('error') or result}")
        return result[1] if len(result) > 1 else {}

    async def _wifi_clients(self, client: httpx.AsyncClient, r: dict) -> int | None:
        try:
            devices = (await self._call(client, r, "iwinfo", "devices")).get("devices") or []
            total = 0
            for dev in devices:
                assoc = await self._call(client, r, "iwinfo", "assoclist", {"device": dev})
                total += len(assoc.get("results") or [])
            return total
        except Exception:
            return None  # ACL pode não permitir iwinfo; o resto continua a valer

    async def _fetch_router(self, client: httpx.AsyncClient, r: dict) -> dict:
        try:
            board = await self._call(client, r, "system", "board")
            info = await self._call(client, r, "system", "info")
            mem = info.get("memory") or {}
            total = mem.get("total") or 0
            free = mem.get("available") or mem.get("free") or 0
            load = info.get("load") or []
            return {
                "name": r["name"],
                "online": True,
                "model": board.get("model"),
                "firmware": (board.get("release") or {}).get("description"),
                "uptime": info.get("uptime"),
                # load do ubus vem multiplicado por 65536
                "load": round(load[0] / 65536, 2) if load else None,
                "mem": round((total - free) / total * 100, 1) if total else None,
                "wifi_clients": await self._wifi_clients(client, r),
            }
        except Exception as exc:
            return {"name": r["name"], "online": False, "error": str(exc)}

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        results = await asyncio.gather(*(self._fetch_router(client, r) for r in self.routers))
        return {"routers": list(results)}
