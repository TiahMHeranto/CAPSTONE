import sys
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
    assert set(versions) == {"baseline", "v1", "v2"}
    for fiche in fiches:
        assert not set(fiche.colonnes) & COLONNES_INTERDITES
        assert fiche.seuil_metier < 1
    assert versions["v2"].artefact_present is True
    assert versions["v2"].algorithme == "xgb"
    assert versions["v2"].colonnes == COLONNES_V2
    assert versions["baseline"].artefact_present is False
    assert versions["baseline"].algorithme == "hgb"


def test_v2_sans_variables_laisse_le_mock_intact() -> None:
    simulé = predict("FAC-00000001", alert_threshold=1)
    with pytest.raises(ModeleIndisponible):
        predict("FAC-00000001", alert_threshold=1, version="v2", models_dir=str(ROOT / "models"))
    encore = predict("FAC-00000001", alert_threshold=1)
    assert encore.score == simulé.score
    assert encore.model_version == "mock-0.1"


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
    assert variables["formule"] == "ESSENTIEL"
    assert "est_fraude" not in variables


@pytest.mark.skipif(sys.version_info >= (3, 14), reason="le pipeline se charge en Python 3.12")
def test_v2_score_puis_retour_au_mock() -> None:
    variables = construire_variables(
        _facture(),
        [{"code": "CONS-GEN", "quantite": 1, "prix_unitaire": 19000, "montant": 19000}],
        contrat={"formule": "ESSENTIEL"},
        prestataire={
            "type_prestataire": "CABINET_GENERALISTE",
            "specialite": None,
            "niveau_tarif": "RAISONNABLE",
            "date_conventionnement": date(2020, 1, 1),
            "date_fin_convention": None,
        },
        tarifs={"CONS-GEN": 19000},
    )
    score = predict(
        "FAC-1",
        alert_threshold=1,
        version="v2",
        models_dir=str(ROOT / "models"),
        variables=variables,
    )
    assert score.model_version == "v2"
    assert 0 <= score.score <= 1
    assert score.explications
    assert score.classe == "normale"
    retour = predict("FAC-1", alert_threshold=0, models_dir=str(ROOT / "models"))
    assert retour.model_version == "mock-0.1"
    assert retour.classe == "alerte"


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
    prediction = predict("FAC-1", alert_threshold=0)
    connexion = _Connexion()
    assert enregistrer(connexion, prediction) == 7
    insertions = [requete for requete, _ in connexion.requetes]
    assert any("app.predictions" in requete for requete in insertions)
    assert any("app.shap_explanations" in requete for requete in insertions)
    assert connexion.requetes[0][1][3] == "mock-0.1"
