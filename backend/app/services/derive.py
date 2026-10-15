"""Dérive des scores par rapport à la distribution de référence du membre 1.

Le seuil lu dans app.settings décide du dépassement. La référence est la clé
distribution_reference de la fiche du modèle actif. Sans cette clé, rien n'est alerté.
"""

import json
import logging
import math
from pathlib import Path

from app.config import settings
from app.services.audit import auditer
from app.services.registry import VERSION_SIMULEE
from app.services.reglages import lire

logger = logging.getLogger(__name__)

TRANCHES = ("0-0.25", "0.25-0.5", "0.5-0.75", "0.75-1")
EFFECTIF_FIABLE = 30
_PLANCHER = 1e-6


def psi(reference: dict[str, float], comptes: dict[str, int]) -> float:
    total = sum(int(comptes[tranche]) for tranche in TRANCHES)
    if total <= 0:
        raise ValueError("effectif nul")
    valeur = 0.0
    for tranche in TRANCHES:
        attendu = max(float(reference[tranche]), _PLANCHER)
        observe = max(int(comptes[tranche]) / total, _PLANCHER)
        valeur += (observe - attendu) * math.log(observe / attendu)
    return valeur


def lire_reference(models_dir: Path, version: str) -> dict[str, float] | None:
    chemin = models_dir / version / "metadata.json"
    if not chemin.is_file():
        return None
    try:
        meta = json.loads(chemin.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        raise ValueError("fiche illisible") from None
    brut = meta.get("distribution_reference")
    if brut is None:
        return None
    if not isinstance(brut, dict):
        raise ValueError("reference illisible")
    if set(brut) != set(TRANCHES):
        raise ValueError("reference illisible")
    try:
        propre = {tranche: float(brut[tranche]) for tranche in TRANCHES}
    except (TypeError, ValueError):
        raise ValueError("reference illisible") from None
    if any(valeur < 0 or valeur > 1 for valeur in propre.values()):
        raise ValueError("reference illisible")
    if abs(sum(propre.values()) - 1) > 0.02:
        raise ValueError("reference illisible")
    return propre


def evaluer(connection, acteur: str) -> dict:
    reglages = lire(connection)
    version = reglages["active_model_version"]
    seuil_brut = reglages.get("drift_psi_threshold", "")
    if not seuil_brut:
        return _corps("reglage_absent", version, None, None, 0, False, False)
    seuil = float(seuil_brut)
    if version == VERSION_SIMULEE:
        return _corps("non_applicable", version, seuil, None, 0, False, False)
    try:
        reference = lire_reference(Path(settings.models_dir), version)
    except ValueError:
        logger.warning("reference derive illisible version=%s", version)
        return _corps("reference_illisible", version, seuil, None, 0, False, False)
    if reference is None:
        return _corps("reference_absente", version, seuil, None, 0, False, False)
    comptes = _compter(connection, version)
    effectif = sum(comptes.values())
    if effectif == 0:
        return _corps("effectif_insuffisant", version, seuil, None, 0, False, False)
    valeur = round(psi(reference, comptes), 4)
    fiable = effectif >= EFFECTIF_FIABLE
    depasse = fiable and valeur >= seuil
    etat = "depassee" if depasse else "indicatif" if not fiable else "stable"
    if depasse:
        _journaliser(connection, acteur, version, valeur, seuil)
    return _corps(etat, version, seuil, valeur, effectif, fiable, depasse)


def _compter(connection, version: str) -> dict[str, int]:
    ligne = connection.execute(
        """
        SELECT
            count(*) FILTER (WHERE score < 0.25),
            count(*) FILTER (WHERE score >= 0.25 AND score < 0.5),
            count(*) FILTER (WHERE score >= 0.5 AND score < 0.75),
            count(*) FILTER (WHERE score >= 0.75)
        FROM app.predictions
        WHERE model_version = %s
        """,
        (version,),
    ).fetchone()
    return {tranche: int(ligne[index]) for index, tranche in enumerate(TRANCHES)}


def _journaliser(connection, acteur: str, version: str, valeur: float, seuil: float) -> None:
    texte = f"{valeur:.4f}"
    dernier = connection.execute(
        """
        SELECT detail->>'psi'
        FROM app.audit_log
        WHERE action = 'derive_detectee' AND entite_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (version,),
    ).fetchone()
    if dernier is not None and dernier[0] == texte:
        return
    auditer(
        connection,
        acteur,
        "derive_detectee",
        "modele",
        version,
        {"psi": texte, "seuil": f"{seuil:.4f}"},
    )


def _corps(etat, version, seuil, valeur, effectif, fiable, depasse) -> dict:
    return {
        "etat": etat,
        "model_version": version,
        "seuil": seuil,
        "psi": valeur,
        "effectif": effectif,
        "fiable": fiable,
        "depasse": depasse,
    }
