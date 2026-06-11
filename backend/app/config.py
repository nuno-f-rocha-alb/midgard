"""Configuração via variáveis de ambiente. Conector sem env vars = desativado."""
from __future__ import annotations

import os
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv() -> None:
    """Em dev carrega o .env da raiz do repo; no Docker o env_file já injetou tudo."""
    dotenv = _ROOT / ".env"
    if not dotenv.exists():
        return
    for line in dotenv.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def env_bool(name: str, default: bool = False) -> bool:
    raw = env(name)
    if not raw:
        return default
    return raw.lower() in ("1", "true", "yes", "on")


# defaults resolvidos a partir da árvore do repo, para dev funcionar de qualquer cwd;
# no Docker as env vars apontam para /app/static e /app/config
STATIC_DIR = Path(env("MIDGARD_STATIC") or _ROOT / "frontend" / "dist")
CONFIG_DIR = Path(env("MIDGARD_CONFIG") or _ROOT / "config")
SERVICES_FILE = CONFIG_DIR / "services.yaml"

# Fallback: se o services.yaml não estiver no CONFIG_DIR (ex.: volume vazio a tapar
# o /config do container), usa a cópia baked dentro do app — os tiles funcionam sempre.
_BAKED_SERVICES = Path(__file__).resolve().parent.parent / "config" / "services.yaml"
if not SERVICES_FILE.exists() and _BAKED_SERVICES.exists():
    SERVICES_FILE = _BAKED_SERVICES
