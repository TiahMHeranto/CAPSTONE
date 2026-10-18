import inspect

import pytest

from app.services import inference
from app.services.inference import predict
from app.services.registry import ModeleIndisponible


def test_version_active_est_v2() -> None:
    assert inference.MODEL_VERSION == "v2"


def test_sans_poids_le_score_echoue() -> None:
    with pytest.raises(ModeleIndisponible):
        predict("FAC-00000001", alert_threshold=0.5, variables={"type_facture": "CONSULTATION"})


def test_alert_threshold_is_not_hardcoded() -> None:
    source = inspect.getsource(inference)
    assert "0.8" not in source
    assert "mock" not in source
