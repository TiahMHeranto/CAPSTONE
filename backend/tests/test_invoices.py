def test_facture_degradee_rejetee(client, monkeypatch, entete) -> None:
    monkeypatch.setattr("app.api.invoices.charger_codes", lambda: ({"CONS-GEN"}, set()))
    response = client.post(
        "/invoices/validate",
        headers=entete(),
        json={
            "facture_id": "FAC-DEGRADEE",
            "type_facture": "CONSULTATION",
            "date_soin": "2024-12-01",
            "date_facture": "2024-11-01",
            "montant_total": -5,
            "lignes": [
                {
                    "code": "INCONNU",
                    "type_ligne": "ACTE",
                    "quantite": 1,
                    "prix_unitaire": 1000,
                    "montant": 1000,
                }
            ],
        },
    )
    assert response.status_code == 422
    body = response.json()
    assert body["valide"] is False
    assert {item["code"] for item in body["rejets"]} >= {
        "MONTANT_NEGATIF",
        "DATES_INCOHERENTES",
        "CODE_INCONNU",
    }


def test_type_invalide_sans_erreur_500(client, entete) -> None:
    response = client.post(
        "/invoices/validate",
        headers=entete(),
        json={"facture_id": "FAC-TYPE", "montant_total": "pas-un-montant"},
    )
    assert response.status_code == 422
    assert response.json()["rejets"][0]["code"] == "TYPE_INVALIDE"


def test_validate_sans_jeton(client) -> None:
    response = client.post(
        "/invoices/validate",
        json={
            "facture_id": "FAC-OK",
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
        },
    )
    assert response.status_code == 401
    assert response.json()["code"] == "NON_AUTORISE"


def test_facture_valide_acceptee(client, monkeypatch, entete) -> None:
    monkeypatch.setattr("app.api.invoices.charger_codes", lambda: ({"CONS-GEN"}, set()))
    response = client.post(
        "/invoices/validate",
        headers=entete(),
        json={
            "facture_id": "FAC-OK",
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
        },
    )
    assert response.status_code == 200
    assert response.json()["valide"] is True
