import logging
import time

import psycopg

from app.cleaning.validate import valider_facture
from app.config import settings
from app.core.tokens import Principal
from app.db.session import ouvrir
from app.schemas.facture import FactureIn, Rejet
from app.services.audit import auditer
from app.services.features import construire_variables
from app.services.inference import enregistrer, predict
from app.services.metrics import calculer
from app.services.notify import notifier
from app.services.prescriptions import charger, controler
from app.services.prescriptions import enregistrer as noter_ordonnance
from app.services.prescriptions import lister as lire_anomalies
from app.services.referentiel import lire_codes
from app.services.registry import VERSION_SIMULEE, ModeleIndisponible
from app.services.reglages import appliquer, lire, normaliser, vue

logger = logging.getLogger(__name__)

STATUTS = {"valider": "VALIDE", "rejeter": "REJETE", "complement": "COMPLEMENT"}


def recevoir(facture: FactureIn, acteur: str) -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            status, body, alerte = soumettre(connection, facture, acteur)
            connection.commit()
    except psycopg.Error as exc:
        logger.warning("depot erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    if alerte is not None:
        body["notifie"] = _notifier(alerte, body["facture_id"])
    return status, body


def recevoir_lot(factures: list[FactureIn], acteur: str) -> tuple[int, dict]:
    resultats = []
    alertes: list[tuple[dict, dict]] = []
    try:
        with ouvrir() as connection:
            for facture in factures:
                status, body, alerte = soumettre(connection, facture, acteur)
                body["statut_http"] = status
                resultats.append(body)
                if alerte is not None:
                    alertes.append((body, alerte))
            connection.commit()
    except psycopg.Error as exc:
        logger.warning("lot erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    for body, alerte in alertes:
        body["notifie"] = _notifier(alerte, body["facture_id"])
    return 200, {"resultats": resultats}


def soumettre(connection, facture: FactureIn, acteur: str) -> tuple[int, dict, dict | None]:
    rejets = valider_facture(facture, *lire_codes(connection))
    rejets.extend(_references(connection, facture))
    if rejets:
        auditer(
            connection,
            acteur,
            "rejet_facture",
            "facture",
            facture.facture_id,
            {"rejets": [rejet.model_dump() for rejet in rejets]},
        )
        return _rejet(facture.facture_id, rejets)
    if _existe(connection, facture.facture_id):
        auditer(
            connection,
            acteur,
            "doublon_facture",
            "facture",
            facture.facture_id,
            {"resultat": "deja_deposee"},
        )
        return (
            409,
            {
                "facture_id": facture.facture_id,
                "valide": False,
                "code": "DOUBLON",
                "motif": "facture deja deposee",
            },
            None,
        )
    try:
        reglages = lire(connection)
        seuil = float(reglages["alert_threshold"])
        if not 0 <= seuil <= 1:
            raise LookupError("seuil hors bornes")
        version = reglages["active_model_version"]
    except (LookupError, ValueError):
        logger.warning("reglage illisible")
        return 503, {"code": "REGLAGE_ABSENT", "motif": "configuration incomplete"}, None
    ordonnance, lignes_ordonnance = charger(connection, _option(facture.ordonnance_id))
    anomalies = controler(connection, facture, ordonnance, lignes_ordonnance)
    debut = time.perf_counter()
    try:
        variables = (
            None
            if version == VERSION_SIMULEE
            else _variables(connection, facture, ordonnance, lignes_ordonnance)
        )
        prediction = predict(
            facture.facture_id,
            seuil,
            version=version,
            models_dir=settings.models_dir,
            variables=variables,
        )
    except ModeleIndisponible:
        return _score_indisponible(connection, acteur, facture.facture_id, version)
    except psycopg.Error:
        raise
    except Exception as exc:
        logger.warning("score erreur=%s", type(exc).__name__)
        return _score_indisponible(connection, acteur, facture.facture_id, version)
    duree_ms = int((time.perf_counter() - debut) * 1000)
    _inserer_facture(connection, facture, acteur)
    enregistrer(connection, prediction, duree_ms)
    noter_ordonnance(connection, facture.facture_id, anomalies)
    logger.info(
        "facture scoree facture=%s classe=%s version=%s",
        facture.facture_id,
        prediction.classe,
        prediction.model_version,
    )
    corps = {
        "facture_id": facture.facture_id,
        "valide": True,
        "rejets": [],
        "prediction": prediction.model_dump(),
        "anomalies_prescription": [item.model_dump() for item in anomalies],
        "notifie": False,
    }
    alerte = None
    if prediction.classe == "alerte":
        alerte = {
            "url": reglages["n8n_webhook_url"],
            "corps": {
                "facture_id": facture.facture_id,
                "assure_id": _option(facture.assure_id) or "",
                "score": prediction.score,
                "classe": prediction.classe,
                "model_version": prediction.model_version,
                "explications": [item.model_dump() for item in prediction.explications[:5]],
                "anomalies_prescription": [item.model_dump() for item in anomalies],
            },
        }
    return 200, corps, alerte


def decider(facture_id: str, decision: str, motif: str, acteur: str) -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            if not _existe(connection, facture_id):
                return 404, {"code": "FACTURE_INCONNUE", "motif": "facture introuvable"}
            prediction = connection.execute(
                """
                SELECT id FROM app.predictions
                WHERE facture_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (facture_id,),
            ).fetchone()
            prediction_id = None if prediction is None else int(prediction[0])
            statut = STATUTS[decision]
            connection.execute(
                """
                INSERT INTO app.decisions
                    (facture_id, prediction_id, acteur, decision, motif)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (facture_id, prediction_id, acteur, decision, motif),
            )
            connection.execute(
                """
                UPDATE app.factures
                SET statut = %s, motif_rejet = %s, date_traitement = CURRENT_DATE
                WHERE facture_id = %s
                """,
                (statut, motif if decision == "rejeter" else None, facture_id),
            )
            auditer(
                connection,
                acteur,
                "decision",
                "facture",
                facture_id,
                {"decision": decision},
            )
            connection.commit()
    except psycopg.Error as exc:
        logger.warning("decision erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {"facture_id": facture_id, "decision": decision, "statut": statut}


def consulter_facture(facture_id: str, principal: Principal) -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            return _lire_facture(connection, facture_id, principal)
    except psycopg.Error as exc:
        logger.warning("lecture facture erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}


def consulter_prediction(facture_id: str, principal: Principal) -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            acces = _lire_facture(connection, facture_id, principal)
            if acces[0] != 200:
                return acces
            prediction = connection.execute(
                """
                SELECT id, score::float, classe, model_version
                FROM app.predictions
                WHERE facture_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (facture_id,),
            ).fetchone()
            if prediction is None:
                return 404, {
                    "code": "PREDICTION_ABSENTE",
                    "motif": "aucun score pour cette facture",
                }
            explications = connection.execute(
                """
                SELECT variable, contribution::float, libelle
                FROM app.shap_explanations
                WHERE prediction_id = %s
                ORDER BY rang
                """,
                (prediction[0],),
            ).fetchall()
    except psycopg.Error as exc:
        logger.warning("lecture prediction erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {
        "facture_id": facture_id,
        "score": prediction[1],
        "classe": prediction[2],
        "model_version": prediction[3],
        "explications": [
            {"variable": ligne[0], "contribution": ligne[1], "libelle": ligne[2]}
            for ligne in explications
        ],
    }


def lister_alertes() -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            rows = connection.execute(
                """
                SELECT p.facture_id, p.score::float, p.model_version, p.created_at::text
                FROM app.predictions AS p
                WHERE p.classe = 'alerte'
                  AND p.id = (
                    SELECT max(dernier.id) FROM app.predictions AS dernier
                    WHERE dernier.facture_id = p.facture_id
                  )
                  AND NOT EXISTS (
                    SELECT 1 FROM app.decisions AS decision
                    WHERE decision.facture_id = p.facture_id
                  )
                ORDER BY p.id DESC
                LIMIT 100
                """
            ).fetchall()
    except psycopg.Error as exc:
        logger.warning("alertes erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {
        "alertes": [
            {
                "facture_id": row[0],
                "score": row[1],
                "model_version": row[2],
                "created_at": row[3],
            }
            for row in rows
        ]
    }


def lister_remboursements(principal: Principal) -> tuple[int, dict]:
    if not principal.assure_id:
        return 200, {"remboursements": []}
    try:
        with ouvrir() as connection:
            rows = connection.execute(
                """
                SELECT f.facture_id, f.statut, f.montant_total, f.date_soin::text
                FROM app.factures AS f
                WHERE f.assure_id = %s
                ORDER BY f.date_soin DESC
                LIMIT 100
                """,
                (principal.assure_id,),
            ).fetchall()
    except psycopg.Error as exc:
        logger.warning("remboursements erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {
        "remboursements": [
            {
                "facture_id": row[0],
                "statut": row[1],
                "montant_total": row[2],
                "date_soin": row[3],
            }
            for row in rows
        ]
    }


def lire_reglages() -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            return 200, vue(lire(connection))
    except LookupError:
        return 503, {"code": "REGLAGE_ABSENT", "motif": "configuration incomplete"}
    except psycopg.Error as exc:
        logger.warning("lecture reglages erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}


def modifier_reglages(acteur: str, changements: dict) -> tuple[int, dict]:
    if not changements:
        return 422, {
            "valide": False,
            "rejets": [{"code": "CHAMP_OBLIGATOIRE", "motif": "aucun reglage fourni"}],
        }
    propres, rejets = normaliser(changements)
    if rejets:
        return 422, {"valide": False, "rejets": [rejet.model_dump() for rejet in rejets]}
    try:
        with ouvrir() as connection:
            actuel = vue(appliquer(connection, acteur, propres))
            connection.commit()
    except LookupError:
        return 503, {"code": "REGLAGE_ABSENT", "motif": "configuration incomplete"}
    except psycopg.Error as exc:
        logger.warning("ecriture reglages erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, actuel


def mesures() -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            return 200, calculer(connection)
    except psycopg.Error as exc:
        logger.warning("metriques erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}


def _score_indisponible(connection, acteur: str, facture_id: str, version: str):
    auditer(
        connection,
        acteur,
        "score_indisponible",
        "facture",
        facture_id,
        {"version": version},
    )
    return (
        503,
        {
            "facture_id": facture_id,
            "valide": True,
            "code": "MODELE_INDISPONIBLE",
            "motif": "modele indisponible",
        },
        None,
    )


def _rejet(facture_id: str, rejets: list[Rejet]) -> tuple[int, dict, None]:
    return (
        422,
        {
            "facture_id": facture_id,
            "valide": False,
            "rejets": [rejet.model_dump() for rejet in rejets],
        },
        None,
    )


def _references(connection, facture: FactureIn) -> list[Rejet]:
    rejets = []
    controles = (
        (
            "prestataire_id",
            facture.prestataire_id,
            """
            SELECT 1 FROM clean.prestataires WHERE prestataire_id = %s
            UNION ALL
            SELECT 1 FROM app.prestataires WHERE prestataire_id = %s
            LIMIT 1
            """,
        ),
        (
            "assure_id",
            facture.assure_id,
            """
            SELECT 1 FROM clean.assures WHERE assure_id = %s
            UNION ALL
            SELECT 1 FROM app.assures WHERE assure_id = %s
            LIMIT 1
            """,
        ),
        (
            "ordonnance_id",
            facture.ordonnance_id,
            """
            SELECT 1 FROM clean.ordonnances WHERE ordonnance_id = %s
            UNION ALL
            SELECT 1 FROM clean.ordonnances WHERE ordonnance_id = %s
            LIMIT 1
            """,
        ),
        (
            "contrat_id",
            facture.contrat_id,
            """
            SELECT 1 FROM clean.contrats WHERE contrat_id = %s
            UNION ALL
            SELECT 1 FROM app.contrats WHERE contrat_id = %s
            LIMIT 1
            """,
        ),
    )
    for champ, valeur, requete in controles:
        if valeur is None or valeur == "":
            continue
        if connection.execute(requete, (valeur, valeur)).fetchone() is None:
            rejets.append(Rejet(code="REFERENCE_INCONNUE", motif=f"{champ} inconnu"))
    return rejets


def _existe(connection, facture_id: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM app.factures WHERE facture_id = %s",
        (facture_id,),
    ).fetchone()
    return row is not None


def _variables(
    connection,
    facture: FactureIn,
    ordonnance: dict | None,
    lignes_ordonnance: list,
) -> dict:
    donnees = facture.model_dump()
    return construire_variables(
        donnees,
        [ligne.model_dump() for ligne in facture.lignes],
        ordonnance=ordonnance,
        lignes_ordonnance=lignes_ordonnance,
        assure=_ligne_assure(connection, facture.assure_id),
        prestataire=_ligne_prestataire(connection, facture.prestataire_id),
        contrat=_ligne_contrat(connection, facture.contrat_id),
        tarifs=_tarifs(connection, facture.prestataire_id),
        historique=_historique(connection, facture.assure_id),
    )


def _ligne_assure(connection, identifiant: str | None) -> dict | None:
    if not identifiant:
        return None
    row = connection.execute(
        """
        SELECT date_adhesion, date_radiation
        FROM clean.assures
        WHERE assure_id = %s
        """,
        (identifiant,),
    ).fetchone()
    if row is None:
        return None
    return {"date_adhesion": row[0], "date_radiation": row[1]}


def _ligne_prestataire(connection, identifiant: str | None) -> dict | None:
    if not identifiant:
        return None
    row = connection.execute(
        """
        SELECT type_prestataire, specialite, niveau_tarif
        FROM app.prestataires
        WHERE prestataire_id = %s
        """,
        (identifiant,),
    ).fetchone()
    if row is not None:
        return {"type_prestataire": row[0], "specialite": row[1], "niveau_tarif": row[2]}
    row = connection.execute(
        """
        SELECT type_prestataire
        FROM clean.prestataires
        WHERE prestataire_id = %s
        """,
        (identifiant,),
    ).fetchone()
    if row is None:
        return None
    return {"type_prestataire": row[0], "specialite": None, "niveau_tarif": None}


def _ligne_contrat(connection, identifiant: str | None) -> dict | None:
    if not identifiant:
        return None
    row = connection.execute(
        "SELECT formule FROM clean.contrats WHERE contrat_id = %s",
        (identifiant,),
    ).fetchone()
    if row is None:
        return None
    return {"formule": row[0]}


def _tarifs(connection, identifiant: str | None) -> dict[str, float]:
    if not identifiant:
        return {}
    rows = connection.execute(
        """
        SELECT code, tarif_pratique
        FROM app.grille_tarifaire
        WHERE prestataire_id = %s
        """,
        (identifiant,),
    ).fetchall()
    return {row[0]: row[1] for row in rows}


def _historique(connection, identifiant: str | None) -> list[dict]:
    if not identifiant:
        return []
    rows = connection.execute(
        """
        SELECT assure_id, prestataire_id, montant_total, date_soin
        FROM clean.factures
        WHERE assure_id = %s
        """,
        (identifiant,),
    ).fetchall()
    return [
        {
            "assure_id": row[0],
            "prestataire_id": row[1],
            "montant_total": row[2],
            "date_soin": row[3],
        }
        for row in rows
    ]


def _inserer_facture(connection, facture: FactureIn, acteur: str) -> None:
    connection.execute(
        """
        INSERT INTO app.factures (
            facture_id, prestataire_id, assure_id, contrat_id, type_facture,
            date_soin, date_facture, date_reception, canal_reception, mode_reglement,
            devise, nb_lignes, montant_total, statut, soumis_par, ordonnance_id
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            facture.facture_id,
            _option(facture.prestataire_id),
            _option(facture.assure_id),
            _option(facture.contrat_id),
            facture.type_facture,
            facture.date_soin,
            facture.date_facture,
            facture.date_reception,
            facture.canal_reception,
            facture.mode_reglement,
            facture.devise,
            len(facture.lignes),
            facture.montant_total,
            "SCOREE",
            acteur,
            _option(facture.ordonnance_id),
        ),
    )
    for index, ligne in enumerate(facture.lignes, start=1):
        connection.execute(
            """
            INSERT INTO app.lignes_facture (
                ligne_id, facture_id, num_ligne, code, type_ligne,
                quantite, prix_unitaire, montant
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                f"{facture.facture_id}-{index}",
                facture.facture_id,
                index,
                ligne.code,
                ligne.type_ligne,
                ligne.quantite,
                ligne.prix_unitaire,
                ligne.montant,
            ),
        )


def _lire_facture(connection, facture_id: str, principal: Principal) -> tuple[int, dict]:
    row = connection.execute(
        """
        SELECT facture_id, statut, montant_total, devise, type_facture,
               date_soin::text, date_facture::text, assure_id, soumis_par
        FROM app.factures
        WHERE facture_id = %s
        """,
        (facture_id,),
    ).fetchone()
    if row is None or not _visible(principal, row[7], row[8]):
        return 404, {"code": "FACTURE_INCONNUE", "motif": "facture introuvable"}
    prediction = connection.execute(
        """
        SELECT score::float, classe, model_version
        FROM app.predictions
        WHERE facture_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (facture_id,),
    ).fetchone()
    decision = connection.execute(
        """
        SELECT decision, motif
        FROM app.decisions
        WHERE facture_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (facture_id,),
    ).fetchone()
    return 200, {
        "facture_id": row[0],
        "statut": row[1],
        "montant_total": row[2],
        "devise": row[3],
        "type_facture": row[4],
        "date_soin": row[5],
        "date_facture": row[6],
        "score": None if prediction is None else prediction[0],
        "classe": None if prediction is None else prediction[1],
        "model_version": None if prediction is None else prediction[2],
        "decision": None if decision is None else {"decision": decision[0], "motif": decision[1]},
        "anomalies_prescription": lire_anomalies(connection, facture_id),
    }


def _visible(principal: Principal, assure_id, soumis_par) -> bool:
    if principal.role in {"gestionnaire", "administrateur"}:
        return True
    if principal.role == "prestataire":
        return soumis_par == principal.identifiant
    if principal.role == "assure":
        return bool(principal.assure_id) and principal.assure_id == assure_id
    return False


def _option(valeur: str | None) -> str | None:
    if valeur is None or valeur == "":
        return None
    return valeur


def _notifier(alerte: dict, facture_id: str) -> bool:
    url = alerte["url"]
    if not url:
        return False
    if notifier(url, alerte["corps"]):
        return True
    try:
        with ouvrir() as connection:
            auditer(
                connection,
                "api",
                "notification_echec",
                "facture",
                facture_id,
                {"resultat": "echec"},
            )
            connection.commit()
    except psycopg.Error as exc:
        logger.warning("audit notification erreur=%s", type(exc).__name__)
    return False
