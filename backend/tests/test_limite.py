from app.config import settings
from app.core.limite import reinitialiser


class _Lignes:
    def __init__(self, lignes):
        self._lignes = lignes

    def fetchone(self):
        return self._lignes[0] if self._lignes else None


class _Base:
    def __init__(self):
        self.appels = 0

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, _requete, _params=None):
        self.appels += 1
        return _Lignes([])


def test_login_limite_le_debit(client, monkeypatch) -> None:
    reinitialiser()
    monkeypatch.setattr(settings, "rate_limit_login", 2)
    base = _Base()
    monkeypatch.setattr("app.db.session.psycopg.connect", lambda *_args, **_kwargs: base)
    corps = {"identifiant": "prestataire", "mot_de_passe": "non"}
    assert client.post("/auth/login", json=corps).status_code == 401
    assert client.post("/auth/login", json=corps).status_code == 401
    bloque = client.post("/auth/login", json=corps)
    assert bloque.status_code == 429
    assert bloque.json()["code"] == "TROP_DE_REQUETES"
    assert base.appels == 2


def test_facture_id_injecte_est_refuse(client, entete) -> None:
    response = client.post(
        "/invoices/validate",
        headers=entete(),
        json={
            "facture_id": "FAC' OR 1=1",
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
    assert response.status_code == 422
    motifs = " ".join(item["motif"] for item in response.json()["rejets"])
    assert "facture_id" in motifs
