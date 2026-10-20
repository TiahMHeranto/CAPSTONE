import csv
from pathlib import Path

from psycopg import Connection

from app.db.catalog import IDENTITES_COLUMNS

COLONNES_INTERDITES = (
    "prenoms",
    "telephone",
    "email",
    "adresse",
    "numero_cin",
    "date_naissance",
    "souscripteur_nom",
    "annee_naissance",
)

SCHEMAS_SERVIS = ("clean", "app")


def secrets_identites(path: Path) -> set[str]:
    secrets: set[str] = set()
    with path.open(encoding="utf-8-sig", newline="") as handle:
        header = next(csv.reader(handle))
        if header != IDENTITES_COLUMNS:
            raise SystemExit(f"en-tete inattendue pour {path.name}")
        for record in csv.DictReader(handle, fieldnames=IDENTITES_COLUMNS):
            for champ in ("assure_id", "email", "telephone", "numero_cin"):
                valeur = (record.get(champ) or "").strip()
                if valeur:
                    secrets.add(valeur)
            nom = " ".join(
                part
                for part in (
                    (record.get("nom") or "").strip(),
                    (record.get("prenoms") or "").strip(),
                )
                if part
            )
            if nom:
                secrets.add(nom)
    return secrets


def localiser(valeurs_par_colonne: dict[str, set[str]], secrets: set[str]) -> list[str]:
    return [colonne for colonne, valeurs in valeurs_par_colonne.items() if valeurs & secrets]


def est_email_de_compte(schema: str, table: str, column: str) -> bool:
    return schema == "app" and table == "utilisateurs" and column == "email"


def colonnes_interdites(connection: Connection) -> list[str]:
    rows = connection.execute(
        """
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = ANY(%s)
          AND NOT (
              table_schema = 'app'
              AND table_name = 'utilisateurs'
              AND column_name = 'email'
          )
          AND (
              column_name = ANY(%s)
              OR (
                  column_name = 'nom'
                  AND table_name <> 'prestataires'
              )
          )
        ORDER BY 1, 2, 3
        """,
        (list(SCHEMAS_SERVIS), list(COLONNES_INTERDITES)),
    ).fetchall()
    return [
        f"{schema}.{table}.{column}"
        for schema, table, column in rows
        if not est_email_de_compte(schema, table, column)
    ]


def scanner(connection: Connection, secrets: set[str]) -> list[str]:
    trouvailles = colonnes_interdites(connection)
    if not secrets:
        return trouvailles
    rows = connection.execute(
        """
        SELECT DISTINCT source
        FROM (
            SELECT 'clean.assures.assure_id' AS source, assure_id AS valeur FROM clean.assures
            UNION ALL
            SELECT 'clean.assures.ville', ville FROM clean.assures
            UNION ALL
            SELECT 'clean.assures.sexe', sexe FROM clean.assures
            UNION ALL
            SELECT 'clean.assures.tranche_age', tranche_age FROM clean.assures
            UNION ALL
            SELECT 'clean.prestataires.nom', nom FROM clean.prestataires
            UNION ALL
            SELECT 'clean.prestataires.ville', ville FROM clean.prestataires
            UNION ALL
            SELECT 'clean.factures.assure_id', assure_id FROM clean.factures
            UNION ALL
            SELECT 'clean.factures.statut', statut FROM clean.factures
            UNION ALL
            SELECT 'clean.factures.motif_rejet', motif_rejet FROM clean.factures
            UNION ALL
            SELECT 'clean.factures.type_facture', type_facture FROM clean.factures
            UNION ALL
            SELECT 'clean.ordonnances.assure_id', assure_id FROM clean.ordonnances
        ) AS textes
        WHERE valeur IS NOT NULL AND valeur = ANY(%s)
        ORDER BY source
        """,
        (list(secrets),),
    ).fetchall()
    trouvailles.extend(row[0] for row in rows)
    return trouvailles
