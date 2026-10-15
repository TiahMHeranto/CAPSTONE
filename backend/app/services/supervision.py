"""Chiffres de l'écran d'administration : volume, latence, erreurs, dérive."""

import logging

import psycopg

from app.db.session import ouvrir
from app.services.derive import evaluer
from app.services.metrics import calculer
from app.services.reglages import lire, vue

logger = logging.getLogger(__name__)


def tableau(acteur: str) -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            corps = {
                "metriques": calculer(connection),
                "derive": evaluer(connection, acteur),
                "reglages": vue(lire(connection)),
            }
            connection.commit()
    except LookupError:
        return 503, {"code": "REGLAGE_ABSENT", "motif": "configuration incomplete"}
    except psycopg.Error as exc:
        logger.warning("supervision erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, corps


def relever_derive(acteur: str) -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            corps = evaluer(connection, acteur)
            connection.commit()
    except LookupError:
        return 503, {"code": "REGLAGE_ABSENT", "motif": "configuration incomplete"}
    except psycopg.Error as exc:
        logger.warning("derive erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, corps
