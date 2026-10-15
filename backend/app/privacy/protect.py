import csv
import logging
from pathlib import Path

from psycopg import Connection

from app.db.catalog import IDENTITES_COLUMNS
from app.privacy.crypto import chiffrer, coffre_fernet, pseudonyme

logger = logging.getLogger(__name__)


def proteger_identites(
    connection: Connection, dataset_dir: Path, clef_hmac: str, clef_coffre: str
) -> None:
    fernet = coffre_fernet(clef_coffre)
    lignes = _lire_identites(dataset_dir / "identites_pii.csv", clef_hmac, fernet)
    connection.execute("TRUNCATE identites.coffre")
    with connection.cursor() as cursor:
        cursor.executemany(
            "INSERT INTO identites.coffre (pseudo_id, charge) VALUES (%s, %s)",
            lignes,
        )
    connection.execute("DROP TABLE IF EXISTS identites.identites_pii")
    logger.info("coffre identites charge n=%s", len(lignes))


def _lire_identites(path: Path, clef_hmac: str, fernet) -> list[tuple[str, bytes]]:
    vus: dict[str, bytes] = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        header = next(csv.reader(handle))
        if header != IDENTITES_COLUMNS:
            raise SystemExit(f"en-tete inattendue pour {path.name}")
        for record in csv.DictReader(handle, fieldnames=IDENTITES_COLUMNS):
            assure_id = (record.get("assure_id") or "").strip()
            if not assure_id:
                continue
            pseudo = pseudonyme(assure_id, clef_hmac)
            vus[pseudo] = chiffrer(fernet, dict(record))
    return list(vus.items())
