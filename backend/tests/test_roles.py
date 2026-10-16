"""Chaque action est refusée quand le rôle du jeton ne correspond pas."""

import pytest

FACTURE = {
    "facture_id": "FAC-ROLE",
    "type_facture": "CONSULTATION",
    "date_soin": "2024-11-11",
    "date_facture": "2024-11-12",
    "montant_total": 19000,
    "lignes": [
        {
            "code": "CONS-GEN",
            "type_ligne": "ACTE",
            "quantite": 1,
            "prix_unitaire": 19000,
            "montant": 19000,
        }
    ],
}

REFUS = [
    ("post", "/invoices/validate", "assure", FACTURE),
    ("post", "/invoices", "assure", FACTURE),
    ("post", "/invoices", "administrateur", FACTURE),
    ("post", "/invoices/batch", "assure", {"factures": [FACTURE]}),
    ("post", "/invoices/batch", "administrateur", {"factures": [FACTURE]}),
    ("get", "/predictions/FAC-ROLE", "prestataire", None),
    ("get", "/predictions/FAC-ROLE", "assure", None),
    ("get", "/alerts", "prestataire", None),
    ("get", "/alerts", "assure", None),
    (
        "post",
        "/alerts/journal",
        "gestionnaire",
        {
            "facture_id": "FAC-ROLE",
            "canal": "webhook",
            "statut": "envoye",
            "tentative": 1,
            "message": "alerte",
        },
    ),
    (
        "post",
        "/alerts/journal",
        "prestataire",
        {
            "facture_id": "FAC-ROLE",
            "canal": "webhook",
            "statut": "envoye",
            "tentative": 1,
            "message": "alerte",
        },
    ),
    ("get", "/alerts/journal", "assure", None),
    ("get", "/alerts/prescriptions", "prestataire", None),
    ("get", "/alerts/prescriptions", "assure", None),
    (
        "post",
        "/invoices/FAC-ROLE/decisions",
        "prestataire",
        {
            "decision": "valider",
            "motif": "pieces conformes",
        },
    ),
    (
        "post",
        "/invoices/FAC-ROLE/decisions",
        "assure",
        {
            "decision": "valider",
            "motif": "pieces conformes",
        },
    ),
    (
        "post",
        "/invoices/FAC-ROLE/decisions",
        "administrateur",
        {
            "decision": "rejeter",
            "motif": "pieces manquantes",
        },
    ),
    ("get", "/me/remboursements", "prestataire", None),
    ("get", "/me/remboursements", "gestionnaire", None),
    ("get", "/me/remboursements", "administrateur", None),
    ("get", "/metrics", "prestataire", None),
    ("get", "/metrics", "assure", None),
    ("get", "/admin/settings", "gestionnaire", None),
    ("get", "/admin/settings", "prestataire", None),
    ("patch", "/admin/settings", "gestionnaire", {"alert_threshold": 0.5}),
    ("patch", "/admin/settings", "assure", {"alert_threshold": 0.5}),
    ("get", "/bi", "prestataire", None),
    ("get", "/bi", "assure", None),
    ("get", "/admin/drift", "gestionnaire", None),
    ("get", "/admin/drift", "prestataire", None),
    ("get", "/admin/supervision", "gestionnaire", None),
    ("get", "/admin/supervision", "assure", None),
    ("get", "/read", "prestataire", None),
    ("get", "/read", "assure", None),
    ("get", "/read/factures", "prestataire", None),
    ("get", "/read/factures", "assure", None),
    ("get", "/read/journal", "prestataire", None),
    ("get", "/read/journal", "assure", None),
    ("get", "/read/app/factures", "prestataire", None),
    ("get", "/read/app/factures", "assure", None),
]


@pytest.mark.parametrize(("methode", "chemin", "role", "corps"), REFUS)
def test_role_refuse(client, entete, methode, chemin, role, corps) -> None:
    response = client.request(methode, chemin, headers=entete(role), json=corps)
    assert response.status_code == 403
    assert response.json()["code"] == "ROLE_REFUSE"


def test_clef_admin_requise_pour_reidentifier(client, entete) -> None:
    response = client.post(
        "/admin/reidentify",
        headers=entete("gestionnaire"),
        json={"pseudo_id": "ab" * 32},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "NON_AUTORISE"
