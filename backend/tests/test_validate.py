from datetime import date

from app.cleaning import rebuild
from app.cleaning.validate import valider_facture
from app.schemas.facture import FactureIn, LigneFactureIn

ACTES = {"CONS-GEN"}
MEDICAMENTS = {"MED-PARA500"}


def facture(**changes) -> FactureIn:
    payload = {
        "facture_id": "FAC-TEST",
        "type_facture": "CONSULTATION",
        "date_soin": date(2024, 11, 11),
        "date_facture": date(2024, 11, 12),
        "montant_total": 19000,
        "lignes": [
            LigneFactureIn(
                code="CONS-GEN",
                type_ligne="ACTE",
                quantite=1,
                prix_unitaire=19000,
                montant=19000,
            )
        ],
    }
    payload.update(changes)
    return FactureIn(**payload)


def codes(result):
    return {rejet.code for rejet in result}


def test_facture_valide() -> None:
    assert valider_facture(facture(), ACTES, MEDICAMENTS) == []


def test_montant_negatif() -> None:
    result = valider_facture(facture(montant_total=-1), ACTES, MEDICAMENTS)
    assert "MONTANT_NEGATIF" in codes(result)


def test_dates_incoherentes() -> None:
    result = valider_facture(
        facture(date_soin=date(2024, 12, 1), date_facture=date(2024, 11, 1)),
        ACTES,
        MEDICAMENTS,
    )
    assert "DATES_INCOHERENTES" in codes(result)


def test_code_inconnu() -> None:
    ligne = LigneFactureIn(
        code="INCONNU",
        type_ligne="ACTE",
        quantite=1,
        prix_unitaire=1000,
        montant=1000,
    )
    result = valider_facture(facture(montant_total=1000, lignes=[ligne]), ACTES, MEDICAMENTS)
    assert "CODE_INCONNU" in codes(result)


def test_somme_des_lignes() -> None:
    result = valider_facture(facture(montant_total=1), ACTES, MEDICAMENTS)
    assert "MONTANT_LIGNES" in codes(result)


def test_rebuild_ne_lit_pas_les_labels() -> None:
    source = "\n".join(rebuild.STEPS)
    assert "est_fraude" not in source
    assert "labels." not in source
    assert "identites." not in source
    assert "date_naissance" not in source
    assert "numero_cin" not in source
    assert "clean.pseudo" in source
    assert "tranche_age" in source
