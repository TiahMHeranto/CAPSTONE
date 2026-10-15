import inspect
from datetime import datetime, timezone
from pathlib import Path

from app.services import bi

RACINE = Path(__file__).resolve().parents[2]
VUES = (RACINE / "migrations" / "sql" / "007_bi.sql").read_text(encoding="utf-8")
INTERDITS = (
    "est_fraude",
    "type_fraude",
    "detail_fraude",
    "est_suspect",
    "identites",
    "labels",
    "numero_cin",
    "prenoms",
    "telephone",
    "email",
    "adresse",
)


class _Lignes:
    def __init__(self, lignes):
        self._lignes = lignes

    def fetchall(self):
        return self._lignes

    def fetchone(self):
        return self._lignes[0] if self._lignes else None


class _Base:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, requete, _params=None):
        if "bi.volumes" in requete:
            return _Lignes([(4, 4, 1, 3, 2, 1, 5)])
        if "bi.alertes_par_statut" in requete:
            instant = datetime(2026, 10, 15, 1, 0, tzinfo=timezone.utc)
            return _Lignes([("webhook", "envoye", 2, instant)])
        if "bi.decisions_humaines" in requete:
            instant = datetime(2026, 10, 15, 1, 5, tzinfo=timezone.utc)
            return _Lignes([("FAC-1", "complement", "gestionnaire", instant, 0.91, "alerte", "v2")])
        if "bi.distribution_scores" in requete:
            return _Lignes([("v2", "0.75-1", 1)])
        raise AssertionError(requete)


def test_vues_sans_label_ni_identite() -> None:
    lignes = [ligne.split("--", 1)[0] for ligne in VUES.splitlines()]
    texte = "\n".join(lignes).lower()
    for mot in INTERDITS:
        assert mot not in texte
    noms = (
        "bi.volumes",
        "bi.alertes_par_statut",
        "bi.decisions_humaines",
        "bi.distribution_scores",
    )
    for nom in noms:
        assert nom in texte
    assert "0.8" not in inspect.getsource(bi)


def test_tableau_bi(client, monkeypatch, entete) -> None:
    monkeypatch.setattr("app.db.session.psycopg.connect", lambda *_args, **_kwargs: _Base())
    assert client.get("/bi").status_code == 401
    assert client.get("/bi", headers=entete()).status_code == 403
    assert client.get("/bi", headers=entete("assure")).status_code == 403
    response = client.get("/bi", headers=entete("gestionnaire"))
    assert response.status_code == 200
    corps = response.json()
    assert corps["volumes"]["nb_factures"] == 4
    assert corps["volumes"]["nb_alertes_modele"] == 1
    assert corps["alertes_par_statut"][0]["statut"] == "envoye"
    assert corps["decisions"][0]["decision"] == "complement"
    assert corps["decisions"][0]["score"] == 0.91
    assert "motif" not in corps["decisions"][0]
    assert corps["distribution_scores"][0]["tranche"] == "0.75-1"
