import hmac
import logging
from typing import Annotated

import psycopg
from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.limite import adresse_de, autoriser
from app.privacy.admin import effacer_identite, reidentifier
from app.schemas.admin import PseudoIn

logger = logging.getLogger(__name__)
router = APIRouter()


def _autorise(clef: str | None) -> bool:
    attendue = settings.admin_api_key
    if not clef or not attendue:
        return False
    return hmac.compare_digest(clef, attendue)


@router.post("/admin/reidentify")
def reidentify(
    payload: PseudoIn,
    request: Request,
    x_admin_key: Annotated[str | None, Header()] = None,
) -> JSONResponse:
    if not autoriser("admin", adresse_de(request), settings.rate_limit_admin):
        return JSONResponse(
            status_code=429,
            content={"code": "TROP_DE_REQUETES", "motif": "trop de tentatives"},
        )
    if not _autorise(x_admin_key):
        return JSONResponse(
            status_code=401,
            content={"code": "NON_AUTORISE", "motif": "admin requis"},
        )
    try:
        with psycopg.connect(settings.psycopg_database_url, connect_timeout=3) as connection:
            clair = reidentifier(
                connection, payload.pseudo_id, settings.pii_encryption_key, "admin"
            )
            connection.commit()
    except ValueError:
        return JSONResponse(
            status_code=422,
            content={"code": "CHARGE_ILLISIBLE", "motif": "dechiffrement impossible"},
        )
    except Exception as exc:
        logger.warning("reidentification impossible erreur=%s", type(exc).__name__)
        return JSONResponse(
            status_code=503,
            content={"code": "BASE_INDISPONIBLE", "motif": "coffre inaccessible"},
        )
    if clair is None:
        return JSONResponse(
            status_code=404,
            content={"code": "PSEUDONYME_INCONNU", "motif": "aucune identite pour ce pseudonyme"},
        )
    return JSONResponse(status_code=200, content=clair)


@router.post("/admin/erase")
def erase(
    payload: PseudoIn,
    request: Request,
    x_admin_key: Annotated[str | None, Header()] = None,
) -> JSONResponse:
    if not autoriser("admin", adresse_de(request), settings.rate_limit_admin):
        return JSONResponse(
            status_code=429,
            content={"code": "TROP_DE_REQUETES", "motif": "trop de tentatives"},
        )
    if not _autorise(x_admin_key):
        return JSONResponse(
            status_code=401,
            content={"code": "NON_AUTORISE", "motif": "admin requis"},
        )
    try:
        with psycopg.connect(settings.psycopg_database_url, connect_timeout=3) as connection:
            efface = effacer_identite(connection, payload.pseudo_id, "admin")
            connection.commit()
    except Exception as exc:
        logger.warning("effacement impossible erreur=%s", type(exc).__name__)
        return JSONResponse(
            status_code=503,
            content={"code": "BASE_INDISPONIBLE", "motif": "coffre inaccessible"},
        )
    if not efface:
        return JSONResponse(
            status_code=404,
            content={"code": "PSEUDONYME_INCONNU", "motif": "aucune identite pour ce pseudonyme"},
        )
    return JSONResponse(status_code=200, content={"efface": True})
