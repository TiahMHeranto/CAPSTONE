from datetime import date
from pathlib import Path

import pytest

from app.services.features import COLONNES_V2, construire_variables
from app.services.inference import enregistrer, predict
from app.services.registry import COLONNES_INTERDITES, ModeleIndisponible, lister_fiches

ROOT = Path(__file__).resolve().parents[2]


def test_fiches_sans_fuite() -> None:
    fiches = lister_fiches(ROOT / "models")
    versions = {fiche.version: fiche for fiche in fiches}
    assert set(versions) == {"v1", "v2", "v3"}
    for fiche in fiches:
        assert not set(fiche.colonnes) & COLONNES_INTERDITES
        assert fiche.seuil_metier < 1
        poids = ROOT / "models" / fiche.version / "model.joblib"
        assert fiche.artefact_present is poids.is_file()
        assert fiche.algorithme == "xgboost"
        assert fiche.colonnes == COLONNES_V2
    assert len(versions["v2"].colonnes) == 23
    # v3 (réglage maximal) vise un rappel plus haut avec un seuil plus bas que v1/v2.
    assert versions["v3"].seuil_metier < versions["v2"].seuil_metier < versions["v1"].seuil_metier


def test_sans_fichier_le_score_echoue(tmp_path: Path) -> None:
    dossier = tmp_path / "v1"
    dossier.mkdir()
    (dossier / "metadata.json").write_bytes((ROOT / "models" / "v1" / "metadata.json").read_bytes())
    with pytest.raises(ModeleIndisponible):
        predict(
            "FAC-00000001",
            alert_threshold=1,
            version="v1",
            models_dir=str(tmp_path),
            variables={"type_facture": "CONSULTATION"},
        )


def _facture() -> dict:
    return {
        "facture_id": "FAC-1",
        "assure_id": "A1",
        "prestataire_id": "P1",
        "montant_total": 19000,
        "date_soin": date(2026, 3, 2),
        "type_facture": "CONSULTATION",
        "mode_reglement": "TIERS_PAYANT",
        "canal_reception": "PORTAIL_PRESTATAIRE",
    }


def test_variables_ordonnance_et_repetition() -> None:
    variables = construire_variables(
        _facture(),
        [{"code": "CONS-GEN", "quantite": 2, "prix_unitaire": 10000, "montant": 20000}],
        ordonnance={
            "assure_id": "A2",
            "date_prescription": date(2026, 1, 1),
            "validite_jours": 30,
        },
        lignes_ordonnance=[{"code": "CONS-GEN", "quantite": 1}],
        assure={"date_adhesion": date(2026, 4, 1), "date_radiation": None},
        prestataire={
            "type_prestataire": "CABINET_GENERALISTE",
            "specialite": None,
            "niveau_tarif": "RAISONNABLE",
            "date_conventionnement": date(2020, 1, 1),
            "date_fin_convention": date(2026, 1, 1),
        },
        contrat={"formule": "ESSENTIEL"},
        tarifs={"CONS-GEN": 19000},
        historique=[
            {
                "assure_id": "A1",
                "prestataire_id": "P1",
                "montant_total": 19000,
                "date_soin": date(2026, 3, 2),
            }
        ],
    )
    assert set(variables) == set(COLONNES_V2)
    assert variables["ord_perimee"] == 1
    assert variables["ord_autre_assure"] == 1
    assert variables["nb_lignes_qte_excedentaire"] == 1
    assert variables["soin_avant_adhesion"] == 1
    assert variables["presta_apres_fin_convention"] == 1
    assert variables["repetition_potentielle"] == 1
    assert variables["nb_factures_meme_jour_prestataire"] == 2
    assert variables["a_ordonnance"] == 1
    assert variables["nb_factures_assure_7j"] == 2
    assert "formule" not in variables
    assert "est_fraude" not in variables


class _Resultat:
    def __init__(self, ligne):
        self._ligne = ligne

    def fetchone(self):
        return self._ligne


class _Connexion:
    def __init__(self):
        self.requetes = []

    def execute(self, requete, params=None):
        self.requetes.append((requete, params))
        if "RETURNING" in requete:
            return _Resultat((7,))
        return _Resultat(None)


def test_enregistrement_porte_la_version_et_les_explications() -> None:
    from app.schemas.prediction import Contribution, Prediction

    prediction = Prediction(
        facture_id="FAC-1",
        score=0.2,
        classe="normale",
        model_version="v2",
        explications=[Contribution(variable="montant_total", contribution=0.2, libelle="Montant")],
    )
    connexion = _Connexion()
    assert enregistrer(connexion, prediction) == 7
    insertions = [requete for requete, _ in connexion.requetes]
    assert any("app.predictions" in requete for requete in insertions)
    assert any("app.shap_explanations" in requete for requete in insertions)
    assert connexion.requetes[0][1][3] == "v2"
