"""Registre des modèles livrés par le membre 1.

v2 pointe vers `model.joblib`, le pipeline à 28 variables.
baseline et v1 n'ont que leur fiche : les poids ne sont pas dans la livraison.
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

VERSION_SIMULEE = "mock-0.1"


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
    if version == VERSION_SIMULEE:
        raise ModeleIndisponible(version)
    meta_path = models_dir / version / "metadata.json"
    if not meta_path.is_file():
        raise ModeleIndisponible(version)
    return _lire(meta_path)


def _lire(meta_path: Path) -> FicheModele:
    brut = meta_path.read_bytes()
    meta = json.loads(brut.decode("utf-8"))
    colonnes = tuple(meta["colonnes"])
    interdites = sorted(set(colonnes) & COLONNES_INTERDITES)
    if interdites:
        raise SystemExit(f"colonnes interdites dans {meta['version']}: {','.join(interdites)}")
    return FicheModele(
        version=meta["version"],
        algorithme=meta["modele"],
        seuil_metier=float(meta["seuil"]),
        colonnes=colonnes,
        metriques=meta["resultats"],
        metadata_sha256=hashlib.sha256(brut).hexdigest(),
        artefact_present=(meta_path.parent / "model.joblib").is_file(),
    )
