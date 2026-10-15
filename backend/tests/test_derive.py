import inspect
import json
from pathlib import Path

from app.services import derive
from app.services.derive import psi


class _Lignes:
    def __init__(self, lignes):
        self._lignes = lignes

    def fetchall(self):
        return self._lignes

    def fetchone(self):
        return self._lignes[0] if self._lignes else None


class _Base:
    def __init__(self, comptes, dernier=None):
        self.comptes = comptes
        self.dernier = dernier
        self.audit = []

    def execute(self, requete, params=None):
        if "FROM app.settings" in requete:
            cles = params[0]
            valeurs = {
                "alert_threshold": "0.5",
                "active_model_version": "v2",
                "notification_channels": "webhook",
                "n8n_webhook_url": "",
                "drift_psi_threshold": "0.25",
            }
            return _Lignes([(cle, valeurs[cle]) for cle in cles if cle in valeurs])
        if "model_version = %s" in requete and "FILTER" in requete:
            return _Lignes([self.comptes])
        if "derive_detectee" in requete:
            return _Lignes([] if self.dernier is None else [(self.dernier,)])
        if "INSERT INTO app.audit_log" in requete:
            self.audit.append(params)
            return _Lignes([])
        raise AssertionError(requete)


def test_psi_nul_si_les_parts_correspondent() -> None:
    reference = {tranche: 0.25 for tranche in derive.TRANCHES}
    assert psi(reference, {tranche: 10 for tranche in derive.TRANCHES}) == 0


def test_seuil_de_derive_non_fige() -> None:
    assert "0.8" not in inspect.getsource(derive)


def test_reference_absente(tmp_path: Path, monkeypatch) -> None:
    dossier = tmp_path / "v2"
    dossier.mkdir()
    (dossier / "metadata.json").write_text(json.dumps({"version": "v2"}), encoding="utf-8")
    monkeypatch.setattr(derive.settings, "models_dir", str(tmp_path))
    corps = derive.evaluer(_Base((0, 0, 0, 0)), "administrateur")
    assert corps["etat"] == "reference_absente"
    assert corps["depasse"] is False


def test_depassement_journalise(tmp_path: Path, monkeypatch) -> None:
    dossier = tmp_path / "v2"
    dossier.mkdir()
    reference = {"0-0.25": 0.7, "0.25-0.5": 0.2, "0.5-0.75": 0.05, "0.75-1": 0.05}
    (dossier / "metadata.json").write_text(
        json.dumps({"distribution_reference": reference}),
        encoding="utf-8",
    )
    monkeypatch.setattr(derive.settings, "models_dir", str(tmp_path))
    base = _Base((0, 0, 0, 40))
    corps = derive.evaluer(base, "administrateur")
    assert corps["etat"] == "depassee"
    assert corps["depasse"] is True
    assert corps["fiable"] is True
    assert base.audit[-1][1] == "derive_detectee"
    assert base.audit[-1][0] == "administrateur"
    suite = _Base((0, 0, 0, 40), dernier=f"{corps['psi']:.4f}")
    encore = derive.evaluer(suite, "administrateur")
    assert encore["depasse"] is True
    assert suite.audit == []


def test_effectif_faible_reste_indicatif(tmp_path: Path, monkeypatch) -> None:
    dossier = tmp_path / "v2"
    dossier.mkdir()
    reference = {tranche: 0.25 for tranche in derive.TRANCHES}
    (dossier / "metadata.json").write_text(
        json.dumps({"distribution_reference": reference}),
        encoding="utf-8",
    )
    monkeypatch.setattr(derive.settings, "models_dir", str(tmp_path))
    base = _Base((2, 0, 0, 0))
    corps = derive.evaluer(base, "administrateur")
    assert corps["etat"] == "indicatif"
    assert corps["depasse"] is False
    assert base.audit == []


def test_supervision(client, monkeypatch, entete) -> None:
    monkeypatch.setattr("app.services.supervision.calculer", lambda _connection: {"volume": 4})
    monkeypatch.setattr(
        "app.services.supervision.evaluer",
        lambda _connection, _acteur: {"etat": "reference_absente", "depasse": False},
    )
    monkeypatch.setattr(
        "app.services.supervision.lire",
        lambda _connection: {
            "alert_threshold": "0.5",
            "active_model_version": "v2",
            "notification_channels": "webhook",
            "n8n_webhook_url": "",
            "drift_psi_threshold": "0.25",
        },
    )
    monkeypatch.setattr("app.db.session.psycopg.connect", lambda *_args, **_kwargs: _Connexion())
    assert client.get("/admin/supervision", headers=entete("gestionnaire")).status_code == 403
    response = client.get("/admin/supervision", headers=entete("administrateur"))
    assert response.status_code == 200
    assert response.json()["metriques"]["volume"] == 4
    assert response.json()["derive"]["etat"] == "reference_absente"
    assert response.json()["reglages"]["active_model_version"] == "v2"


def test_routes_derive(client, monkeypatch, entete) -> None:
    monkeypatch.setattr(
        "app.services.supervision.evaluer",
        lambda _connection, acteur: {
            "etat": "reference_absente",
            "model_version": "v2",
            "seuil": 0.25,
            "psi": None,
            "effectif": 0,
            "fiable": False,
            "depasse": False,
            "acteur": acteur,
        },
    )
    monkeypatch.setattr("app.db.session.psycopg.connect", lambda *_args, **_kwargs: _Connexion())
    assert client.get("/admin/drift", headers=entete("gestionnaire")).status_code == 403
    response = client.get("/admin/drift", headers=entete("administrateur"))
    assert response.status_code == 200
    assert response.json()["etat"] == "reference_absente"
    assert response.json()["acteur"] == "administrateur"


class _Connexion:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def commit(self):
        return None

    def execute(self, *_args, **_kwargs):
        raise AssertionError("evaluer est remplace")
