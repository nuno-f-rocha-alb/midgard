"""Registry: instancia todos os conectores e devolve só os que têm config."""
from __future__ import annotations

from .base import Connector
from .beszel import Beszel
from .bifrost import Bifrost
from .crafty import Crafty
from .emby import Emby
from .healthcheck import HealthCheck
from .openwrt import OpenWrt
from .pihole import PiHole
from .portainer import Portainer
from .proxmox import Proxmox
from .qbittorrent import QBittorrent
from .scrutiny import Scrutiny
from .speedtest import SpeedtestTracker

ALL = [
    Beszel,
    Portainer,
    PiHole,
    Proxmox,
    Emby,
    Crafty,
    QBittorrent,
    Scrutiny,
    SpeedtestTracker,
    Bifrost,
    OpenWrt,
    HealthCheck,
]


def enabled_connectors() -> list[Connector]:
    return [conn for cls in ALL if (conn := cls()).enabled]
