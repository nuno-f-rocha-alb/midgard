from __future__ import annotations

import logging
import re
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from .config import STATIC_DIR, env
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


_ASSET_RE = re.compile(r"^[A-Za-z0-9_-]+$")


@app.get("/api/karakeep/asset/{asset_id}")
async def karakeep_asset(asset_id: str) -> Response:
    """Proxy autenticado para as imagens arquivadas do Karakeep — o browser não
    pode enviar a API key, por isso o backend (que a tem) busca e reencaminha."""
    base = env("KARAKEEP_URL").rstrip("/")
    key = env("KARAKEEP_API_KEY")
    if not (base and key) or not _ASSET_RE.match(asset_id):
        raise HTTPException(status_code=404)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(
                f"{base}/api/assets/{asset_id}",
                headers={"Authorization": f"Bearer {key}"},
            )
    except Exception:
        raise HTTPException(status_code=502)
    if r.status_code != 200:
        raise HTTPException(status_code=404)
    return Response(
        content=r.content,
        media_type=r.headers.get("content-type", "application/octet-stream"),
        headers={"Cache-Control": "public, max-age=86400"},
    )


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
