from app.config import settings


class _Lignes:
    def __init__(self, lignes):
        self._lignes = lignes

    def fetchall(self):
        return self._lignes

    def fetchone(self):
        return self._lignes[0] if self._lignes else None


class _Journal:
    def __init__(self):
        self.rows = []
        self._id = 0

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def commit(self):
        return None

    def execute(self, requete, params=None):
        if "INSERT INTO app.alertes" in requete:
            self._id += 1
            self.rows.append(params)
            return _Lignes([])
        if "FROM app.alertes" in requete:
            lignes = []
            for index, row in enumerate(self.rows, start=1):
                if params and row[2] != params[0]:
                    continue
                lignes.append((index, row[0], row[1], row[2], row[3], row[4], row[5], "2026-10-15"))
            return _Lignes(list(reversed(lignes)))
        raise AssertionError(requete)


def _brancher(monkeypatch):
    journal = _Journal()
    monkeypatch.setattr("app.db.session.psycopg.connect", lambda *_args, **_kwargs: journal)
    return journal


def test_journal_reserve_a_l_administrateur(client, entete) -> None:
    response = client.post(
        "/alerts/journal",
        headers=entete("gestionnaire"),
        json={
            "facture_id": "FAC-1",
            "canal": "webhook",
            "statut": "envoye",
            "tentative": 1,
            "score": 0.9,
            "message": "Alerte FAC-1",
        },
    )
    assert response.status_code == 403


def test_journal_enregistre_puis_filtre_les_echecs(client, monkeypatch, entete) -> None:
    _brancher(monkeypatch)
    entete_admin = {"X-Admin-Key": settings.admin_api_key}
    corps = {
        "facture_id": "FAC-1",
        "canal": "webhook",
        "statut": "envoye",
        "tentative": 1,
        "score": 0.91,
        "message": "Alerte FAC-1 | Lien http://localhost:8000/invoices/FAC-1",
    }
    assert client.post("/alerts/journal", headers=entete_admin, json=corps).status_code == 201
    echec = dict(corps, statut="echec", canal="slack", tentative=3, facture_id="FAC-2")
    assert client.post("/alerts/journal", headers=entete_admin, json=echec).status_code == 201
    assert client.get("/alerts/journal", headers=entete()).status_code == 403
    file = client.get("/alerts/journal", headers=entete("gestionnaire"), params={"statut": "echec"})
    assert file.status_code == 200
    alertes = file.json()["alertes"]
    assert [item["facture_id"] for item in alertes] == ["FAC-2"]
    assert alertes[0]["tentative"] == 3
    assert "nom" not in alertes[0]["message"]
