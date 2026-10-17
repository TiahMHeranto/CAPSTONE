import pytest

from app.rag.sql_guard import RequeteRefusee, demande_liste, exemples, exemples_proches, valider


def test_lister_choisit_une_liste_pas_un_total() -> None:
    texte = exemples_proches("Peux tu me lister mes facture")
    assert texte.startswith("Question: Peux-tu me lister mes factures ?")
    assert demande_liste("Peux tu me lister mes facture")
    assert not demande_liste("Quel est le montant total de mes factures ?")


def test_exemples_sont_des_select() -> None:
    for exemple in exemples():
        sql = valider(exemple["sql"])
        assert "LIMIT" in sql.upper()


def test_garde_fou() -> None:
    with pytest.raises(RequeteRefusee):
        valider("DELETE FROM clean.dossier_factures")
    with pytest.raises(RequeteRefusee):
        valider("SELECT facture_id FROM clean.factures")
    with pytest.raises(RequeteRefusee):
        valider("SELECT * FROM clean.dossier_factures")
    with pytest.raises(RequeteRefusee):
        valider("SELECT set_config('prediccare.assure_id', 'x', true)")
    with pytest.raises(RequeteRefusee):
        valider(
            "SELECT facture_id FROM clean.dossier_factures WHERE assure_id = 'ASS-1'"
        )
    autorise = valider(
        "SELECT facture_id FROM clean.dossier_factures WHERE assure_id = 'ASS-1'",
        identifiants=True,
    )
    assert "ASS-1" in autorise
