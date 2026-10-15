from app.config import settings

PSEUDO = "ab" * 32


def test_admin_sans_clef(client, monkeypatch) -> None:
    def interdit(*_args, **_kwargs):
        raise AssertionError("le coffre ne doit pas etre lu")

    monkeypatch.setattr("app.api.admin.reidentifier", interdit)
    response = client.post(
        "/admin/reidentify",
        json={"pseudo_id": PSEUDO},
        headers={"X-Admin-Key": "clef-refusee"},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "NON_AUTORISE"


def test_admin_pseudonyme_mal_forme(client) -> None:
    response = client.post(
        "/admin/reidentify",
        json={"pseudo_id": "Nom Secret"},
        headers={"X-Admin-Key": settings.admin_api_key},
    )
    assert response.status_code == 422
    assert response.json()["rejets"][0]["code"] == "TYPE_INVALIDE"


def test_admin_reidentifie(client, monkeypatch) -> None:
    class _Connexion:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def commit(self) -> None:
            return None

    monkeypatch.setattr("app.api.admin.psycopg.connect", lambda *_args, **_kwargs: _Connexion())
    monkeypatch.setattr(
        "app.api.admin.reidentifier",
        lambda *_args, **_kwargs: {"nom": "Exemple", "email": "personne@example.com"},
    )
    response = client.post(
        "/admin/reidentify",
        json={"pseudo_id": PSEUDO},
        headers={"X-Admin-Key": settings.admin_api_key},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "personne@example.com"
