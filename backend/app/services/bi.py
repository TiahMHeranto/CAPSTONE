"""Lecture des vues bi pour l'écran du membre 3."""

import logging
from datetime import datetime

import psycopg

from app.db.session import ouvrir

logger = logging.getLogger(__name__)


def tableau() -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            corps = lire(connection)
    except LookupError:
        logger.warning("lecture bi erreur=vue_vide")
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "vues inaccessibles"}
    except psycopg.Error as exc:
        logger.warning("lecture bi erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "vues inaccessibles"}
    return 200, corps


def lire(connection) -> dict:
    volumes = connection.execute(
        """
        SELECT nb_factures, nb_predictions, nb_alertes_modele, nb_normales,
               nb_notifications, nb_decisions, nb_rejets
        FROM bi.volumes
        """
    ).fetchone()
    if volumes is None:
        raise LookupError("volumes absents")
    alertes = connection.execute(
        """
        SELECT canal, statut, nb, derniere
        FROM bi.alertes_par_statut
        ORDER BY canal, statut
        """
    ).fetchall()
    decisions = connection.execute(
        """
        SELECT facture_id, decision, acteur, created_at, score, classe, model_version
        FROM bi.decisions_humaines
        ORDER BY created_at DESC
        LIMIT 100
        """
    ).fetchall()
    distribution = connection.execute(
        """
        SELECT model_version, tranche, nb
        FROM bi.distribution_scores
        ORDER BY model_version, tranche
        """
    ).fetchall()
    return {
        "volumes": {
            "nb_factures": int(volumes[0]),
            "nb_predictions": int(volumes[1]),
            "nb_alertes_modele": int(volumes[2]),
            "nb_normales": int(volumes[3]),
            "nb_notifications": int(volumes[4]),
            "nb_decisions": int(volumes[5]),
            "nb_rejets": int(volumes[6]),
        },
        "alertes_par_statut": [
            {
                "canal": ligne[0],
                "statut": ligne[1],
                "nb": int(ligne[2]),
                "derniere": _instant(ligne[3]),
            }
            for ligne in alertes
        ],
        "decisions": [
            {
                "facture_id": ligne[0],
                "decision": ligne[1],
                "acteur": ligne[2],
                "created_at": _instant(ligne[3]),
                "score": None if ligne[4] is None else round(float(ligne[4]), 6),
                "classe": ligne[5],
                "model_version": ligne[6],
            }
            for ligne in decisions
        ],
        "distribution_scores": [
            {"model_version": ligne[0], "tranche": ligne[1], "nb": int(ligne[2])}
            for ligne in distribution
        ],
    }


def _instant(valeur: datetime | None) -> str | None:
    if valeur is None:
        return None
    return valeur.isoformat()
