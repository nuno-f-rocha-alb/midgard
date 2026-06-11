"""Um loop asyncio por conector; resultados vão para o Store."""
from __future__ import annotations

import asyncio
import logging

import httpx

from .connectors.base import Connector
from .store import Store, fail, ok

log = logging.getLogger("midgard.poller")


async def run_connector(conn: Connector, store: Store) -> None:
    async with httpx.AsyncClient(verify=conn.verify_tls, timeout=conn.timeout) as client:
        while True:
            try:
                data = await conn.fetch(client)
                await store.update(conn.name, ok(data))
            except Exception as exc:
                log.warning("%s: %s", conn.name, exc)
                await store.update(conn.name, fail(str(exc)))
            await asyncio.sleep(conn.interval)


def start_all(connectors: list[Connector], store: Store) -> list[asyncio.Task]:
    tasks = []
    for conn in connectors:
        log.info("a iniciar conector: %s (%ss)", conn.name, conn.interval)
        tasks.append(asyncio.create_task(run_connector(conn, store), name=f"poll:{conn.name}"))
    return tasks
