import inspect

from app.services import inference
from app.services.inference import predict


def test_score_is_stable() -> None:
    first = predict("FAC-00000001", alert_threshold=1)
    second = predict("FAC-00000001", alert_threshold=1)
    assert first.score == second.score
    assert first.model_version == "mock-0.1"


def test_classe_follows_the_threshold_argument() -> None:
    low_bar = predict("FAC-00000001", alert_threshold=0)
    high_bar = predict("FAC-00000001", alert_threshold=1)
    assert low_bar.classe == "alerte"
    assert high_bar.classe == "normale"
    assert low_bar.score == high_bar.score


def test_alert_threshold_is_not_hardcoded() -> None:
    source = inspect.getsource(inference)
    assert "0.8" not in source
