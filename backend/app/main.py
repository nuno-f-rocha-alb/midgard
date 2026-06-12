from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import STATIC_DIR
from .connectors import enabled_connectors
from .poller import start_all
from .store import Store

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("midgard")

store = Store()


@asynccontextmanager
async def lifespan(app: FastAPI):
    connectors = enabled_connectors()
    log.info("conectores ativos: %s", [c.name for c in connectors] or "nenhum")
    tasks = start_all(connectors, store)
    yield
    for task in tasks:
        task.cancel()


app = FastAPI(title="Midgard", lifespan=lifespan)


@app.middleware("http")
async def cache_headers(request, call_next):
    """Assets do Vite têm hash no nome → cache eterna; o resto do estático
    (index.html etc.) revalida sempre, senão o browser segura versões velhas."""
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif not path.startswith("/api"):
        response.headers["Cache-Control"] = "no-cache"
    return response


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/snapshot")
def snapshot() -> dict:
    return store.snapshot()


@app.websocket("/api/ws")
async def websocket(ws: WebSocket) -> None:
    await ws.accept()
    await store.attach(ws)
    try:
        while True:
            await ws.receive_text()  # keepalive do cliente; ignoramos o conteúdo
    except WebSocketDisconnect:
        pass
    finally:
        await store.detach(ws)


# frontend estático (build do Vite); em dev usa-se `npm run dev` com proxy
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str) -> FileResponse:
        candidate = STATIC_DIR / path
        if path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
