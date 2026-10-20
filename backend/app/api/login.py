import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.limite import adresse_de, autoriser
from app.core.tokens import emettre, hacher, verifier
from app.db.session import ouvrir
from app.schemas.flux import LoginIn

logger = logging.getLogger(__name__)
router = APIRouter()
_LEURRE = hacher("identifiant-inconnu")


@router.post("/auth/login")
def login(payload: LoginIn, request: Request) -> JSONResponse:
    if not autoriser("login", adresse_de(request), settings.rate_limit_login):
        return JSONResponse(
            status_code=429,
            content={"code": "TROP_DE_REQUETES", "motif": "trop de tentatives"},
        )
    try:
        with ouvrir() as connection:
            row = connection.execute(
                """
                SELECT identifiant, mot_de_passe_hash, role, assure_id, actif, prestataire_id
                FROM app.utilisateurs
                WHERE is_deleted = false
                  AND (identifiant = %s OR lower(email) = lower(%s))
                ORDER BY (identifiant = %s) DESC
                LIMIT 1
                """,
                (payload.identifiant, payload.identifiant, payload.identifiant),
            ).fetchone()
    except Exception as exc:
        logger.warning("login erreur=%s", type(exc).__name__)
        return JSONResponse(
            status_code=503,
            content={"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"},
        )
    stocke = _LEURRE if row is None else row[1]
    if row is None or not row[4] or not verifier(payload.mot_de_passe, stocke):
        return JSONResponse(
            status_code=401,
            content={"code": "IDENTIFIANTS_INVALIDES", "motif": "identifiants refuses"},
        )
    prestataire = row[5] if len(row) > 5 else None
    return JSONResponse(
        status_code=200,
        content={
            "token": emettre(row[0], row[2], row[3], prestataire_id=prestataire),
            "role": row[2],
        },
    )
