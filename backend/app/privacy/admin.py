import logging

from cryptography.fernet import InvalidToken
from psycopg import Connection

from app.privacy.crypto import coffre_fernet, dechiffrer, detail_audit

logger = logging.getLogger(__name__)


def reidentifier(
    connection: Connection, pseudo_id: str, clef_coffre: str, acteur: str
) -> dict | None:
    row = connection.execute("SELECT identites.lire_charge(%s)", (pseudo_id,)).fetchone()
    clair = None
    resultat = "absent"
    if row is not None and row[0] is not None:
        try:
            clair = dechiffrer(coffre_fernet(clef_coffre), bytes(row[0]))
            resultat = "trouve"
        except InvalidToken as exc:
            _auditer(connection, acteur, "reidentification", pseudo_id, "illisible")
            raise ValueError("charge illisible") from exc
    _auditer(connection, acteur, "reidentification", pseudo_id, resultat)
    return clair


def effacer_identite(connection: Connection, pseudo_id: str, acteur: str) -> bool:
    row = connection.execute("SELECT identites.effacer_charge(%s)", (pseudo_id,)).fetchone()
    efface = bool(row and row[0])
    _auditer(connection, acteur, "effacement", pseudo_id, "efface" if efface else "absent")
    return efface


def _auditer(
    connection: Connection, acteur: str, action: str, pseudo_id: str, resultat: str
) -> None:
    connection.execute(
        """
        INSERT INTO app.audit_log (acteur, action, entite, entite_id, detail)
        VALUES (%s, %s, 'assure', %s, %s::jsonb)
        """,
        (acteur, action, pseudo_id, detail_audit(resultat)),
    )
    logger.info("audit action=%s resultat=%s", action, resultat)
