import logging

import psycopg

from app.db.session import ouvrir

logger = logging.getLogger(__name__)


def deposer(
    facture_id: str,
    canal: str,
    statut: str,
    tentative: int,
    score: float | None,
    message: str,
) -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            connection.execute(
                """
                INSERT INTO app.alertes
                    (facture_id, canal, statut, tentative, score, message)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (facture_id, canal, statut, tentative, score, message),
            )
            connection.commit()
    except psycopg.Error as exc:
        logger.warning("journal alerte erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 201, {"enregistre": True}


def lister(statut: str | None) -> tuple[int, dict]:
    requete = """
        SELECT id, facture_id, canal, statut, tentative, score::float, message, created_at::text
        FROM app.alertes
    """
    params: tuple = ()
    if statut:
        requete += " WHERE statut = %s"
        params = (statut,)
    requete += " ORDER BY id DESC LIMIT 100"
    try:
        with ouvrir() as connection:
            rows = connection.execute(requete, params).fetchall()
    except psycopg.Error as exc:
        logger.warning("lecture journal erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {
        "alertes": [
            {
                "id": row[0],
                "facture_id": row[1],
                "canal": row[2],
                "statut": row[3],
                "tentative": row[4],
                "score": row[5],
                "message": row[6],
                "created_at": row[7],
            }
            for row in rows
        ]
    }
