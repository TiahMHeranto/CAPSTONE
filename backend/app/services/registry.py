"""Registre des modèles livrés par le membre 1.

v1 et v2 sont des pipelines XGBoost à 23 variables. Le score lit
`models/<version>/model.joblib`. Il n'y a pas de score simulé.
"""

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

COLONNES_INTERDITES = {
    "est_fraude",
    "type_fraude",
    "detail_fraude",
    "est_suspect",
    "est_valide",
    "statut",
    "motif_rejet",
    "montant_pris_en_charge",
    "reste_a_charge",
    "date_traitement",
    "nom",
    "prenoms",
    "telephone",
    "email",
    "adresse",
    "numero_cin",
    "date_naissance",
    "diagnostic",
}


class ModeleIndisponible(LookupError):
    """La fiche existe, le fichier de poids n'est pas encore là."""


@dataclass(frozen=True)
class FicheModele:
    version: str
    algorithme: str
    seuil_metier: float
    colonnes: tuple[str, ...]
    metriques: dict
    metadata_sha256: str
    artefact_present: bool


def lister_fiches(models_dir: Path) -> list[FicheModele]:
    if not models_dir.is_dir():
        raise SystemExit(f"registre introuvable: {models_dir}")
    fiches = []
    for dossier in sorted(path for path in models_dir.iterdir() if path.is_dir()):
        meta_path = dossier / "metadata.json"
        if not meta_path.is_file():
            continue
        fiches.append(_lire(meta_path))
    if not fiches:
        raise SystemExit(f"aucune fiche dans {models_dir}")
    return fiches


def charger_fiche(models_dir: Path, version: str) -> FicheModele:
    meta_path = models_dir / version / "metadata.json"
    if not meta_path.is_file():
        raise ModeleIndisponible(version)
    return _lire(meta_path)


def _lire(meta_path: Path) -> FicheModele:
    brut = meta_path.read_bytes()
    meta = json.loads(brut.decode("utf-8"))
    colonnes = tuple(meta.get("features") or meta["colonnes"])
    interdites = sorted(set(colonnes) & COLONNES_INTERDITES)
    if interdites:
        raise SystemExit(f"colonnes interdites dans {meta['version']}: {','.join(interdites)}")
    seuil = meta.get("seuil_alerte", meta.get("seuil"))
    return FicheModele(
        version=meta["version"],
        algorithme=meta["modele"],
        seuil_metier=float(seuil),
        colonnes=colonnes,
        metriques=meta.get("resultats_test") or meta.get("resultats") or {},
        metadata_sha256=hashlib.sha256(brut).hexdigest(),
        artefact_present=chemin_artefact(meta_path.parent) is not None,
    )
