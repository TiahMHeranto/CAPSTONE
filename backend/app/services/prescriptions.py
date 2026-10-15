"""Contrôles d'ordonnance au moment du dépôt.

Le diagnostic d'un assuré n'est pas lu par l'API. La base répond seulement
si une spécialité facturée est hors de la correspondance.
"""

import logging

import psycopg

from app.db.session import ouvrir
from app.schemas.facture import FactureIn, Rejet

logger = logging.getLogger(__name__)


def charger(connection, ordonnance_id: str | None) -> tuple[dict | None, list[dict]]:
    if not ordonnance_id:
        return None, []
    row = connection.execute(
        """
        SELECT assure_id, date_prescription, validite_jours
        FROM clean.ordonnances
        WHERE ordonnance_id = %s
        """,
        (ordonnance_id,),
    ).fetchone()
    if row is None:
        return None, []
    lignes = connection.execute(
        """
        SELECT code, quantite
        FROM clean.ordonnance_lignes
        WHERE ordonnance_id = %s
        ORDER BY num_ligne
        """,
        (ordonnance_id,),
    ).fetchall()
    return (
        {
            "ordonnance_id": ordonnance_id,
            "assure_id": row[0],
            "date_prescription": row[1],
            "validite_jours": row[2],
        },
        [{"code": ligne[0], "quantite": ligne[1]} for ligne in lignes if ligne[0]],
    )


def controler(
    connection,
    facture: FactureIn,
    ordonnance: dict | None,
    lignes: list[dict],
) -> list[Rejet]:
    if ordonnance is None:
        return []
    codes = sorted({ligne["code"] for ligne in lignes})
    incompatible = False
    if facture.lignes:
        flag = connection.execute(
            "SELECT clean.diagnostic_incompatible(%s, %s)",
            (ordonnance["ordonnance_id"], [ligne.code for ligne in facture.lignes]),
        ).fetchone()
        incompatible = bool(flag and flag[0])
    return relever(
        facture.model_dump(),
        ordonnance,
        lignes,
        doublon=_doublon(connection, ordonnance, codes),
        incompatible=incompatible,
    )


def relever(
    facture: dict,
    ordonnance: dict | None,
    lignes: list[dict],
    doublon: bool,
    incompatible: bool,
) -> list[Rejet]:
    if ordonnance is None:
        return []
    trouvailles: list[Rejet] = []
    assure = facture.get("assure_id")
    if assure and ordonnance.get("assure_id") and ordonnance["assure_id"] != assure:
        trouvailles.append(
            Rejet(code="ORDONNANCE_AUTRE_ASSURE", motif="ordonnance d'un autre assure")
        )
    delai = _delai(facture, ordonnance)
    validite = ordonnance.get("validite_jours")
    if delai is not None and validite is not None and delai > validite:
        trouvailles.append(Rejet(code="ORDONNANCE_PERIMEE", motif="delai au-dela de la validite"))
    prescrit = {ligne["code"]: float(ligne["quantite"] or 0) for ligne in lignes}
    if lignes:
        for ligne in facture.get("lignes") or []:
            quantite = prescrit.get(ligne["code"])
            if quantite is None:
                trouvailles.append(
                    Rejet(code="LIGNES_NON_PRESCRITES", motif="ligne absente de l'ordonnance")
                )
                break
            if float(ligne["quantite"]) > quantite:
                trouvailles.append(
                    Rejet(code="QUANTITE_EXCEDENTAIRE", motif="quantite au-dessus de l'ordonnance")
                )
                break
    if doublon:
        trouvailles.append(
            Rejet(
                code="DOUBLON_PRESCRIPTION",
                motif="memes codes sur une ordonnance encore valable",
            )
        )
    if incompatible:
        trouvailles.append(
            Rejet(code="PRESCRIPTION_INADAPTEE", motif="specialite de l'acte hors du diagnostic")
        )
    return trouvailles


def enregistrer(connection, facture_id: str, anomalies: list[Rejet]) -> None:
    for anomalie in anomalies:
        connection.execute(
            """
            INSERT INTO app.anomalies_prescription (facture_id, code, motif)
            VALUES (%s, %s, %s)
            """,
            (facture_id, anomalie.code, anomalie.motif),
        )


def tableau() -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            return 200, {"anomalies": lister(connection)}
    except psycopg.Error as exc:
        logger.warning("anomalies prescription erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}


def lister(connection, facture_id: str | None = None) -> list[dict]:
    if facture_id:
        rows = connection.execute(
            """
            SELECT code, motif
            FROM app.anomalies_prescription
            WHERE facture_id = %s
            ORDER BY id
            """,
            (facture_id,),
        ).fetchall()
        return [{"code": row[0], "motif": row[1]} for row in rows]
    rows = connection.execute(
        """
        SELECT facture_id, code, motif, created_at::text
        FROM app.anomalies_prescription
        ORDER BY id DESC
        LIMIT 100
        """
    ).fetchall()
    return [
        {"facture_id": row[0], "code": row[1], "motif": row[2], "created_at": row[3]}
        for row in rows
    ]


def _doublon(connection, ordonnance: dict, codes: list[str]) -> bool:
    debut = ordonnance.get("date_prescription")
    if not codes or debut is None or not ordonnance.get("assure_id"):
        return False
    fin_jours = ordonnance.get("validite_jours") or 0
    row = connection.execute(
        """
        SELECT 1
        FROM clean.ordonnances AS autre
        WHERE autre.assure_id = %s
          AND autre.ordonnance_id <> %s
          AND autre.date_prescription IS NOT NULL
          AND autre.date_prescription <= %s::date + %s
          AND %s::date <= autre.date_prescription + coalesce(autre.validite_jours, 0)
          AND (
              SELECT array_agg(code ORDER BY code)
              FROM clean.ordonnance_lignes
              WHERE ordonnance_id = autre.ordonnance_id AND code IS NOT NULL
          ) = %s::text[]
        LIMIT 1
        """,
        (ordonnance["assure_id"], ordonnance["ordonnance_id"], debut, fin_jours, debut, codes),
    ).fetchone()
    return row is not None


def _delai(facture: dict, ordonnance: dict):
    debut = ordonnance.get("date_prescription")
    soin = facture.get("date_soin")
    if debut is None or soin is None:
        return None
    return (soin - debut).days
