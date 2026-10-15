import json
from pathlib import Path

from app.config import settings
from app.services.notify import notifier

WORKFLOW = Path(__file__).resolve().parents[2] / "n8n" / "workflows" / "alerte.json"
INTERDITS = ("numero_cin", "souscripteur_nom", "prenoms", "date_naissance", "est_fraude")


def test_workflow_importe_le_seuil_et_le_journal() -> None:
    data = json.loads(WORKFLOW.read_text(encoding="utf-8"))
    brut = json.dumps(data, ensure_ascii=False)
    for interdit in INTERDITS:
        assert interdit not in brut
    assert data["name"] == "PrediCare alerte"
    noms = {node["name"] for node in data["nodes"]}
    assert {"Reception", "Lire reglages", "Sous le seuil", "Journal"} <= noms
    assert "alert_threshold" in brut
    assert "/alerts/journal" in brut
    assert any(node.get("retryOnFail") and node.get("maxTries") == 3 for node in data["nodes"])
    reception = next(node for node in data["nodes"] if node["name"] == "Reception")
    assert reception["parameters"]["path"] == "alerte"


def test_notifier_pose_la_clef(monkeypatch) -> None:
    vus = {}

    class _Reponse:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

    def faux(requete, timeout=0):
        vus["entetes"] = {cle.lower(): valeur for cle, valeur in requete.header_items()}
        vus["timeout"] = timeout
        return _Reponse()

    monkeypatch.setattr("app.services.notify.urllib.request.urlopen", faux)
    assert notifier("http://n8n.test/hook", {"facture_id": "FAC-1"}) is True
    assert vus["entetes"]["x-alert-key"] == settings.admin_api_key
