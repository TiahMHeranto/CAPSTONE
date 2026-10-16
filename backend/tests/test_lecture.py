"""La lecture est isolée : pas de jeton, rôle refusé, nom de relation borné."""

from app.services.lecture import nom_valide


def test_nom_borne() -> None:
    assert nom_valide("factures")
    assert not nom_valide("Factures")
    assert not nom_valide("app.factures")
    assert not nom_valide("factures;drop")
    assert not nom_valide("")


def test_lecture_sans_jeton(client) -> None:
    for chemin in ("/read", "/read/factures", "/read/journal", "/read/clean/factures"):
        response = client.get(chemin)
        assert response.status_code == 401
        assert response.json()["code"] == "NON_AUTORISE"
