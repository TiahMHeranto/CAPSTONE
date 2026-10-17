import pytest

from app.rag.sql_guard import RequeteRefusee, exemples, valider


def test_exemples_sont_des_select_limites() -> None:
    detail = exemples()[1]["sql"]
    sql = valider(detail)
    assert "dossier_lignes" in sql
    assert "prestataires" in sql
    assert "LIMIT 1" in sql
    assert sql.upper().rstrip().endswith("LIMIT 50")
    for exemple in exemples():
        obtenu = valider(exemple["sql"])
        assert "LIMIT" in obtenu.upper()


def test_delete_et_autre_schema_sont_refuses() -> None:
    with pytest.raises(RequeteRefusee):
        valider("DELETE FROM clean.dossier_factures")
    with pytest.raises(RequeteRefusee):
        valider("SELECT facture_id FROM app.factures")
    with pytest.raises(RequeteRefusee):
        valider("SELECT facture_id FROM clean.dossier_factures; DROP TABLE clean.factures")


def test_identifiant_de_compte_et_etoile_sont_refuses() -> None:
    with pytest.raises(RequeteRefusee):
        valider(
            "SELECT facture_id FROM clean.dossier_factures WHERE prestataire_id = 'PRE-9'"
        )
    with pytest.raises(RequeteRefusee):
        valider("SELECT set_config('prediccare.assure_id', 'x', true)")
    with pytest.raises(RequeteRefusee):
        valider("SELECT * FROM clean.dossier_factures")
    assert "COUNT" in valider("SELECT COUNT(*) AS nombre FROM clean.dossier_factures").upper()
