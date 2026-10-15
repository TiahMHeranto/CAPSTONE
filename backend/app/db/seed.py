import csv
import logging
from pathlib import Path

from psycopg import Connection

from app.db.catalog import LABELS_FRAUDE_COLUMNS, LABELS_PRESTATAIRES_COLUMNS, RAW_TABLES

logger = logging.getLogger(__name__)

RAW_FILES = {
    "assures": "assures.csv",
    "contrats": "contrats.csv",
    "factures": "factures.csv",
    "garanties": "garanties.csv",
    "grille_tarifaire": "grille_tarifaire.csv",
    "lignes_facture": "lignes_facture.csv",
    "ordonnances": "ordonnances.csv",
    "ordonnance_lignes": "ordonnance_lignes.csv",
    "prestataires": "prestataires.csv",
    "referentiel_actes": "referentiel_actes.csv",
    "referentiel_medicaments": "referentiel_medicaments.csv",
}


def seed_if_empty(connection: Connection, dataset_dir: Path, labels_dir: Path) -> None:
    count = connection.execute("SELECT COUNT(*) FROM raw.factures").fetchone()
    if count is not None and count[0] > 0:
        logger.info("raw deja charge")
        return
    for table, filename in RAW_FILES.items():
        _copy_csv(connection, "raw", table, dataset_dir / filename, RAW_TABLES[table])
    _copy_csv(
        connection,
        "labels",
        "labels_fraude",
        labels_dir / "labels_fraude.csv",
        LABELS_FRAUDE_COLUMNS,
    )
    _copy_csv(
        connection,
        "labels",
        "labels_prestataires",
        labels_dir / "labels_prestataires.csv",
        LABELS_PRESTATAIRES_COLUMNS,
    )
    logger.info("chargement initial termine")


def _copy_csv(
    connection: Connection,
    schema: str,
    table: str,
    path: Path,
    expected: list[str],
) -> None:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        header = next(csv.reader(handle))
        if header != expected:
            raise SystemExit(f"en-tete inattendue pour {path.name}")
        columns = ", ".join(expected)
        statement = f"COPY {schema}.{table} ({columns}) FROM STDIN WITH (FORMAT CSV)"
        with connection.cursor() as cursor:
            with cursor.copy(statement) as copy:
                while True:
                    chunk = handle.read(1024 * 1024)
                    if not chunk:
                        break
                    copy.write(chunk)
    loaded = connection.execute(f"SELECT COUNT(*) FROM {schema}.{table}").fetchone()
    row_count = loaded[0] if loaded is not None else 0
    logger.info("table chargee %s.%s rows=%s", schema, table, row_count)
