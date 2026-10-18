import logging
from pathlib import Path

from app.schemas.prediction import Contribution, Prediction
from app.services.features import LIBELLES
from app.services.registry import ModeleIndisponible, charger_fiche

logger = logging.getLogger(__name__)
MODEL_VERSION = "v2"


def predict(
    facture_id: str,
    alert_threshold: float,
    version: str = MODEL_VERSION,
    models_dir: str = "models",
    variables: dict | None = None,
) -> Prediction:
    """Point d'entrée unique. Seul le pipeline enregistré répond."""
    fiche = charger_fiche(Path(models_dir), version)
    if not fiche.artefact_present:
        raise ModeleIndisponible(f"{version}: model.joblib absent")
    if variables is None:
        raise ModeleIndisponible(f"{version}: variables absentes")
    score, explications = _scorer(
        Path(models_dir) / version / "model.joblib", fiche.colonnes, variables
    )
    rounded = round(score, 6)
    return Prediction(
        facture_id=facture_id,
        score=rounded,
        classe="alerte" if rounded >= alert_threshold else "normale",
        model_version=version,
        explications=explications,
    )


def enregistrer(connection, prediction: Prediction, duree_ms: int | None = None) -> int:
    row = connection.execute(
        """
        INSERT INTO app.predictions (facture_id, score, classe, model_version, duree_ms)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            prediction.facture_id,
            prediction.score,
            prediction.classe,
            prediction.model_version,
            duree_ms,
        ),
    ).fetchone()
    prediction_id = int(row[0])
    for rang, explication in enumerate(prediction.explications, start=1):
        connection.execute(
            """
            INSERT INTO app.shap_explanations
                (prediction_id, rang, variable, contribution, libelle)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                prediction_id,
                rang,
                explication.variable,
                explication.contribution,
                explication.libelle,
            ),
        )
    return prediction_id


def _scorer(
    path: Path, colonnes: tuple[str, ...], variables: dict
) -> tuple[float, list[Contribution]]:
    try:
        import pandas as pd

        pipeline = _charger(path)
        frame = pd.DataFrame([{colonne: variables.get(colonne) for colonne in colonnes}])
        score = float(pipeline.predict_proba(frame)[0, 1])
        return score, _contributions(pipeline, frame, colonnes)
    except ModeleIndisponible:
        raise
    except Exception as exc:
        logger.warning("score indisponible erreur=%s", type(exc).__name__)
        raise ModeleIndisponible(f"{path.parent.name}: {type(exc).__name__}") from exc


def _charger(path: Path):
    import sklearn.compose._column_transformer as colonne

    if not hasattr(colonne, "_RemainderColsList"):

        class _RemainderColsList(list):
            pass

        colonne._RemainderColsList = _RemainderColsList
    import joblib

    return joblib.load(path)


def _contributions(pipeline, frame, colonnes: tuple[str, ...]) -> list[Contribution]:
    import xgboost as xgb

    prepare = pipeline.named_steps["preprocess"]
    classifieur = pipeline.named_steps["classifier"]
    matrice = prepare.transform(frame)
    noms = [str(nom) for nom in prepare.get_feature_names_out()]
    valeurs = classifieur.get_booster().predict(
        xgb.DMatrix(matrice, feature_names=noms),
        pred_contribs=True,
    )[0]
    sommes: dict[str, float] = {}
    for nom, valeur in zip(noms, valeurs[:-1]):
        source = _source(nom, colonnes)
        sommes[source] = sommes.get(source, 0.0) + float(valeur)
    ordre = sorted(sommes, key=lambda cle: abs(sommes[cle]), reverse=True)[:8]
    return [
        Contribution(
            variable=nom,
            contribution=round(sommes[nom], 6),
            libelle=LIBELLES.get(nom, nom),
        )
        for nom in ordre
    ]


def _source(nom_encode: str, colonnes: tuple[str, ...]) -> str:
    brut = nom_encode.split("__", 1)[-1]
    for colonne in sorted(colonnes, key=len, reverse=True):
        if brut == colonne or brut.startswith(colonne + "_"):
            return colonne
    return brut
