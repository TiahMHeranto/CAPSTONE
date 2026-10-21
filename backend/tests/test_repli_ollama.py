from app.services.assistant import _discuter, embarquer
from app.services.registry import ModeleIndisponible


def test_embedding_google_reste_prioritaire(monkeypatch):
    appels = []

    def google(_texte):
        appels.append("google")
        return [0.1] * 768

    def local(_texte):
        appels.append("ollama")
        return [0.2] * 768

    monkeypatch.setattr("app.services.assistant._embarquer_google", google)
    monkeypatch.setattr("app.services.assistant._embarquer_ollama", local)
    assert embarquer("plafond") == [0.1] * 768
    assert appels == ["google"]


def test_embedding_passe_sur_ollama(monkeypatch):
    def google(_texte):
        raise ModeleIndisponible("quota")

    monkeypatch.setattr("app.services.assistant._embarquer_google", google)
    monkeypatch.setattr(
        "app.services.assistant._ollama",
        lambda _chemin, _charge: {"embeddings": [[0.25] * 768]},
    )
    vecteur = embarquer("plafond")
    assert len(vecteur) == 768
    assert abs(sum(item * item for item in vecteur) - 1) < 1e-6


def test_reponse_passe_sur_llama(monkeypatch):
    def google(_messages, _outils=None, _forcer_json=False):
        raise ModeleIndisponible("quota")

    monkeypatch.setattr("app.services.assistant._discuter_google", google)
    monkeypatch.setattr(
        "app.services.assistant._ollama",
        lambda chemin, charge: {
            "message": {"content": "La formule ESSENTIEL couvre 80 %."},
        }
        if chemin == "/api/chat" and charge["model"] == "llama3.2"
        else {},
    )
    corps = _discuter(
        [{"role": "user", "content": "Quel est le taux ?"}],
    )
    assert corps["message"]["content"] == "La formule ESSENTIEL couvre 80 %."
