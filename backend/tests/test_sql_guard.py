import pytest

from app.rag.sql_guard import RequeteRefusee, demande_liste, exemples, exemples_proches, valider


def test_lister_choisit_une_liste_pas_un_total() -> None:
    texte = exemples_proches("Peux tu me lister mes facture")
    assert texte.startswith("Question: Peux-tu me lister mes factures ?")
    assert demande_liste("Peux tu me lister mes facture")
    assert demande_liste("Donne-moi le détail de ma dernière facture")
    assert not demande_liste("Quel est le montant total de mes factures ?")
    assert not demande_liste("peut tu me donner le montant de mon dernier facture")


def test_montant_derniere_facture_reste_un_montant() -> None:
    texte = exemples_proches("peut tu me donner le montant de mon dernier facture")
    assert texte.startswith("Question: Quel est le montant de ma dernière facture ?")
    sql = valider(
        "SELECT montant_total, statut, date_soin FROM clean.dossier_factures "
        "ORDER BY date_soin DESC LIMIT 1"
    )
    assert "montant_total" in sql
    assert "facture_id" not in sql


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
        valider("SELECT facture_id FROM clean.dossier_factures WHERE assure_id = 'ASS-1'")
    autorise = valider(
        "SELECT facture_id FROM clean.dossier_factures WHERE assure_id = 'ASS-1'",
        identifiants=True,
    )
    assert "ASS-1" in autorise
