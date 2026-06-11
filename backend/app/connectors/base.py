from __future__ import annotations

import httpx


class Connector:
    """Cada conector lê a sua config do ambiente no __init__.

    `enabled` decide se entra no poller; `fetch` devolve o dict que vai
    direto para o frontend. Auth com estado (tokens, cookies) vive na
    instância e é renovada dentro de `fetch` quando expira.
    """

    name: str = "base"
    interval: int = 30
    timeout: int = 10
    verify_tls: bool = True

    @property
    def enabled(self) -> bool:
        raise NotImplementedError

    async def fetch(self, client: httpx.AsyncClient) -> dict:
        raise NotImplementedError


def num(value, default=None):
    """Float defensivo — APIs de terceiros mudam tipos entre versões."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
