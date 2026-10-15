from datetime import date

from app.services.prescriptions import relever


def _facture():
    return {
        "assure_id": "A1",
        "date_soin": date(2026, 3, 20),
        "lignes": [{"code": "CONS-GEN", "quantite": 2}],
    }


def _ordonnance():
    return {
        "ordonnance_id": "ORD-1",
        "assure_id": "A1",
        "date_prescription": date(2026, 1, 1),
        "validite_jours": 10,
    }


def test_ordonnance_perimee_et_quantite():
    anomalies = relever(
        _facture(),
        _ordonnance(),
        [{"code": "CONS-GEN", "quantite": 1}],
        doublon=False,
        incompatible=False,
    )
    assert {item.code for item in anomalies} == {"ORDONNANCE_PERIMEE", "QUANTITE_EXCEDENTAIRE"}


def test_doublon_et_diagnostic_sans_texte_medical():
    anomalies = relever(
        _facture(),
        _ordonnance(),
        [{"code": "CONS-GEN", "quantite": 2}],
        doublon=True,
        incompatible=True,
    )
    codes = {item.code for item in anomalies}
    assert "DOUBLON_PRESCRIPTION" in codes
    assert "PRESCRIPTION_INADAPTEE" in codes
    assert all("Paludisme" not in item.motif for item in anomalies)


def test_sans_ordonnance_rien_a_signaler():
    assert relever(_facture(), None, [], doublon=True, incompatible=True) == []
