import inspect
from pathlib import Path

import pytest

from app.services import inference
from app.services.features import COLONNES_V2
from app.services.inference import predict
from app.services.registry import ModeleIndisponible

ROOT = Path(__file__).resolve().parents[2]


def test_version_active_est_v2() -> None:
    assert inference.MODEL_VERSION == "v2"


def test_sans_poids_le_score_echoue(tmp_path: Path) -> None:
    dossier = tmp_path / "v2"
    dossier.mkdir()
    (dossier / "metadata.json").write_bytes((ROOT / "models" / "v2" / "metadata.json").read_bytes())
    with pytest.raises(ModeleIndisponible):
        predict(
            "FAC-00000001",
            alert_threshold=0.5,
            version="v2",
            models_dir=str(tmp_path),
            variables={"type_facture": "CONSULTATION"},
        )


def test_colonnes_differentes_sont_refusees() -> None:
    class _Prepare:
        feature_names_in_ = ["montant_total"]

    class _Pipeline:
        named_steps = {"preprocess": _Prepare()}

    with pytest.raises(ModeleIndisponible):
        inference._verifier_poids(_Pipeline(), COLONNES_V2, "v2")


def test_v1_et_v2_scorent_quand_les_poids_sont_la() -> None:
    if not all((ROOT / "models" / version / "model.joblib").is_file() for version in ("v1", "v2")):
        pytest.skip("poids absents")
    variables = {colonne: 0 for colonne in COLONNES_V2}
    variables["type_facture"] = "CONSULTATION"
    for version in ("v1", "v2"):
        prediction = predict(
            "FAC-00000001",
            alert_threshold=0.5,
            version=version,
            models_dir=str(ROOT / "models"),
            variables=variables,
        )
        assert prediction.model_version == version
        assert 0 <= prediction.score <= 1
        assert prediction.explications


def test_alert_threshold_is_not_hardcoded() -> None:
    source = inspect.getsource(inference)
    assert "0.8" not in source
    assert "mock" not in source
