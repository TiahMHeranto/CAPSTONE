"""Limite de débit en mémoire, par adresse et par famille de routes."""

import threading
import time

from fastapi import Request

from app.config import settings

_verrou = threading.Lock()
_coups: dict[tuple[str, str], list[float]] = {}


def autoriser(famille: str, adresse: str, quota: int) -> bool:
    if quota <= 0:
        return True
    maintenant = time.monotonic()
    fenetre = float(settings.rate_limit_window_s)
    cle = (famille, adresse)
    with _verrou:
        coups = [instant for instant in _coups.get(cle, []) if maintenant - instant < fenetre]
        if len(coups) >= quota:
            _coups[cle] = coups
            return False
        coups.append(maintenant)
        _coups[cle] = coups
        return True


def reinitialiser() -> None:
    with _verrou:
        _coups.clear()


def adresse_de(request: Request) -> str:
    if request.client is None or not request.client.host:
        return "inconnu"
    return request.client.host
