"""Comptes rattachés à un assuré ou à un prestataire du référentiel."""

import json
import logging

import psycopg
from cryptography.fernet import InvalidToken

from app.config import settings
from app.core.tokens import ROLES, Principal, hacher
from app.db.session import ouvrir
from app.privacy.crypto import coffre_fernet, dechiffrer

logger = logging.getLogger(__name__)

_LIEN_ASSURE = "assure"
_LIEN_PRESTATAIRE = "prestataire"


def creer(acteur: str, payload) -> tuple[int, dict]:
    role = payload.role
    assure_id = _vide(payload.assure_id)
    prestataire_id = _vide(payload.prestataire_id)
    if role not in ROLES:
        return 422, {"code": "ROLE_INCONNU", "motif": "role inconnu"}
    if role == _LIEN_ASSURE:
        if not assure_id or prestataire_id:
            return 422, {"code": "LIEN_REQUIS", "motif": "un assure exige son pseudonyme"}
    elif role == _LIEN_PRESTATAIRE:
        if not prestataire_id or assure_id:
            return 422, {"code": "LIEN_REQUIS", "motif": "un professionnel exige son etablissement"}
    elif assure_id or prestataire_id:
        return 422, {"code": "LIEN_REFUSE", "motif": "ce role n'est pas rattache a une personne"}
    try:
        with ouvrir() as connection:
            if role == _LIEN_ASSURE and not _existe(
                connection, "clean.assures", "assure_id", assure_id
            ):
                return 422, {"code": "LIEN_INCONNU", "motif": "assure absent du referentiel"}
            if role == _LIEN_PRESTATAIRE and not _existe(
                connection, "clean.prestataires", "prestataire_id", prestataire_id
            ):
                return 422, {"code": "LIEN_INCONNU", "motif": "prestataire absent du referentiel"}
            deja = connection.execute(
                "SELECT 1 FROM app.utilisateurs WHERE identifiant = %s",
                (payload.identifiant,),
            ).fetchone()
            if deja:
                return 409, {"code": "IDENTIFIANT_PRIS", "motif": "cet identifiant existe deja"}
            connection.execute(
                """
                INSERT INTO app.utilisateurs
                    (identifiant, mot_de_passe_hash, role, assure_id, prestataire_id)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    payload.identifiant,
                    hacher(payload.mot_de_passe),
                    role,
                    assure_id,
                    prestataire_id,
                ),
            )
            _auditer(connection, acteur, payload.identifiant, role)
            connection.commit()
    except psycopg.Error as exc:
        logger.warning("creation compte erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 201, {"identifiant": payload.identifiant, "role": role}


def lister() -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            rows = connection.execute(
                """
                SELECT identifiant, role, assure_id, prestataire_id, actif
                FROM app.utilisateurs
                ORDER BY identifiant
                """
            ).fetchall()
    except psycopg.Error as exc:
        logger.warning("liste comptes erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {
        "utilisateurs": [
            {
                "identifiant": row[0],
                "role": row[1],
                "assure_id": row[2],
                "prestataire_id": row[3],
                "actif": row[4],
            }
            for row in rows
        ]
    }


def annuaire(cible: str) -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            if cible == _LIEN_ASSURE:
                return 200, {"personnes": _noms_assures(connection)}
            if cible == _LIEN_PRESTATAIRE:
                return 200, {"personnes": _noms_prestataires(connection)}
    except psycopg.Error as exc:
        logger.warning("annuaire erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 422, {"code": "CIBLE_INCONNUE", "motif": "annuaire assure ou prestataire"}


def profil(principal: Principal) -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            if principal.role == _LIEN_ASSURE:
                return 200, _profil_assure(connection, principal)
            if principal.role == _LIEN_PRESTATAIRE:
                return 200, _profil_prestataire(connection, principal)
    except psycopg.Error as exc:
        logger.warning("profil erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {"identifiant": principal.identifiant, "role": principal.role, "lien": None}


def contrat_de(principal: Principal) -> tuple[int, dict]:
    status, corps = profil(principal)
    if status != 200:
        return status, corps
    return 200, {"contrat": corps.get("contrat"), "role": principal.role}


def factures_de(principal: Principal) -> tuple[int, dict]:
    colonne, valeur = _filtre(principal)
    if colonne is None:
        return 200, {"factures": []}
    try:
        with ouvrir() as connection:
            rows = connection.execute(
                f"""
                SELECT facture_id, statut, type_facture, montant_total,
                       date_soin::text, ordonnance_id
                FROM clean.factures
                WHERE {colonne} = %s
                ORDER BY date_soin DESC NULLS LAST
                LIMIT 50
                """,
                (valeur,),
            ).fetchall()
    except psycopg.Error as exc:
        logger.warning("dossier factures erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {
        "factures": [
            {
                "facture_id": row[0],
                "statut": row[1],
                "type_facture": row[2],
                "montant_total": row[3],
                "date_soin": row[4],
                "ordonnance_id": row[5],
            }
            for row in rows
        ]
    }


def ordonnances_de(principal: Principal) -> tuple[int, dict]:
    if principal.role == _LIEN_ASSURE and principal.assure_id:
        filtre = "assure_id = %s"
        valeur = principal.assure_id
    elif principal.role == _LIEN_PRESTATAIRE and principal.prestataire_id:
        filtre = "prescripteur_id = %s"
        valeur = principal.prestataire_id
    else:
        return 200, {"ordonnances": []}
    try:
        with ouvrir() as connection:
            rows = connection.execute(
                f"""
                SELECT ordonnance_id, date_prescription::text, validite_jours, prescripteur_id
                FROM clean.ordonnances
                WHERE {filtre}
                ORDER BY date_prescription DESC NULLS LAST
                LIMIT 50
                """,
                (valeur,),
            ).fetchall()
    except psycopg.Error as exc:
        logger.warning("dossier ordonnances erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {
        "ordonnances": [
            {
                "ordonnance_id": row[0],
                "date_prescription": row[1],
                "validite_jours": row[2],
                "prescripteur_id": row[3],
            }
            for row in rows
        ]
    }


def _profil_assure(connection, principal: Principal) -> dict:
    if not principal.assure_id:
        return {
            "identifiant": principal.identifiant,
            "role": principal.role,
            "lien": None,
            "motif": "compte non rattache",
        }
    row = connection.execute(
        """
        SELECT a.assure_id, a.sexe, a.ville,
               a.date_adhesion::text, a.date_radiation::text,
               a.contrat_id, c.formule, c.statut, c.date_effet::text, c.date_fin::text
        FROM clean.assures AS a
        LEFT JOIN clean.contrats AS c ON c.contrat_id = a.contrat_id
        WHERE a.assure_id = %s
        """,
        (principal.assure_id,),
    ).fetchone()
    if row is None:
        return {
            "identifiant": principal.identifiant,
            "role": principal.role,
            "lien": principal.assure_id,
            "motif": "assure absent du referentiel",
        }
    return {
        "identifiant": principal.identifiant,
        "role": principal.role,
        "lien": row[0],
        "nom": _nom(connection, principal.identifiant, row[0]),
        "sexe": row[1],
        "ville": row[2],
        "date_adhesion": row[3],
        "date_radiation": row[4],
        "contrat": {
            "contrat_id": row[5],
            "formule": row[6],
            "statut": row[7],
            "date_effet": row[8],
            "date_fin": row[9],
        },
    }


def _profil_prestataire(connection, principal: Principal) -> dict:
    if not principal.prestataire_id:
        return {
            "identifiant": principal.identifiant,
            "role": principal.role,
            "lien": None,
            "motif": "compte non rattache",
        }
    row = connection.execute(
        """
        SELECT prestataire_id, nom, type_prestataire, ville, statut
        FROM clean.prestataires
        WHERE prestataire_id = %s
        """,
        (principal.prestataire_id,),
    ).fetchone()
    if row is None:
        return {
            "identifiant": principal.identifiant,
            "role": principal.role,
            "lien": principal.prestataire_id,
            "motif": "prestataire absent du referentiel",
        }
    return {
        "identifiant": principal.identifiant,
        "role": principal.role,
        "lien": row[0],
        "nom": row[1],
        "type": row[2],
        "ville": row[3],
        "statut": row[4],
        "contrat": None,
    }


def _nom(connection, acteur: str, pseudo_id: str) -> dict | None:
    row = connection.execute("SELECT identites.lire_charge(%s)", (pseudo_id,)).fetchone()
    clair = None
    resultat = "absent"
    if row is not None and row[0] is not None:
        try:
            charge = dechiffrer(coffre_fernet(settings.pii_encryption_key), bytes(row[0]))
            clair = {"nom": charge.get("nom"), "prenoms": charge.get("prenoms")}
            resultat = "trouve"
        except InvalidToken:
            resultat = "illisible"
    connection.execute(
        """
        INSERT INTO app.audit_log (acteur, action, entite, entite_id, detail)
        VALUES (%s, 'profil', 'assure', %s, %s::jsonb)
        """,
        (acteur, pseudo_id, json.dumps({"resultat": resultat})),
    )
    return clair


def _noms_assures(connection) -> list[dict]:
    charges = connection.execute(
        "SELECT pseudo_id, charge FROM identites.lire_annuaire()"
    ).fetchall()
    lieux = {
        row[0]: row[1]
        for row in connection.execute(
            "SELECT assure_id, ville FROM clean.assures"
        ).fetchall()
    }
    personnes = []
    fernet = coffre_fernet(settings.pii_encryption_key)
    for pseudo_id, charge in charges:
        if charge is None:
            continue
        try:
            clair = dechiffrer(fernet, bytes(charge))
        except InvalidToken:
            continue
        prenoms = (clair.get("prenoms") or "").strip()
        nom = (clair.get("nom") or "").strip()
        libelle = " ".join(part for part in (prenoms, nom) if part)
        if not libelle:
            continue
        personnes.append(
            {
                "assure_id": pseudo_id,
                "nom": libelle,
                "ville": lieux.get(pseudo_id),
            }
        )
    personnes.sort(key=lambda item: item["nom"].casefold())
    return personnes


def _noms_prestataires(connection) -> list[dict]:
    rows = connection.execute(
        """
        SELECT prestataire_id, nom, type_prestataire, ville
        FROM clean.prestataires
        ORDER BY nom
        """
    ).fetchall()
    return [
        {
            "prestataire_id": row[0],
            "nom": row[1],
            "type": row[2],
            "ville": row[3],
        }
        for row in rows
        if row[1]
    ]


def _filtre(principal: Principal) -> tuple[str | None, str | None]:
    if principal.role == _LIEN_ASSURE and principal.assure_id:
        return "assure_id", principal.assure_id
    if principal.role == _LIEN_PRESTATAIRE and principal.prestataire_id:
        return "prestataire_id", principal.prestataire_id
    return None, None


def _existe(connection, table: str, colonne: str, valeur: str) -> bool:
    row = connection.execute(
        f"SELECT 1 FROM {table} WHERE {colonne} = %s",
        (valeur,),
    ).fetchone()
    return row is not None


def _auditer(connection, acteur: str, identifiant: str, role: str) -> None:
    connection.execute(
        """
        INSERT INTO app.audit_log (acteur, action, entite, entite_id, detail)
        VALUES (%s, 'creation_compte', 'utilisateur', %s, %s::jsonb)
        """,
        (acteur, identifiant, json.dumps({"role": role})),
    )


def _vide(valeur: str | None) -> str | None:
    if valeur is None or valeur.strip() == "":
        return None
    return valeur.strip()
