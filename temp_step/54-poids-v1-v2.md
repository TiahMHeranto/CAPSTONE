# Poids v1 et v2

## Fait

`models/v1/model.joblib` et `models/v2/model.joblib` sont des pipelines XGBoost à 23 variables, dans l'ordre de la fiche. Le registre les trouve. Un écart de colonnes refuse le score. Les deux versions répondent sur une facture neutre : score 0,010889, classe normale, 8 contributions. La version active reste celle du réglage, `v2`.

Les pipelines ont été enregistrés avec scikit-learn 1.9.1. L'image API est alignée sur cette version. XGBoost affiche encore un avertissement au chargement, et le score sort quand même.

## Pourquoi

Sans la fonction qui pointe vers `model.joblib`, le dépôt ne pouvait pas ouvrir les poids. scikit-learn 1.6.1 chargeait le fichier avec un avertissement de version incompatible.

## Fichiers

- `backend/app/services/registry.py`
- `backend/app/services/inference.py`
- `backend/tests/test_registry.py`
- `backend/tests/test_inference.py`
- `backend/requirements.txt`

Le registre en base marque les deux artefacts présents. `alembic_version` est passé à `016_features_v2`, la révision déjà en place : le conteneur `migrate` échouait en rejouant une vue plus ancienne.

## Vérification

`pytest backend/tests/test_registry.py backend/tests/test_inference.py` : 9 tests. Dans l'API : les deux versions scorent, `sklearn` 1.9.1, `/health` sain.

## Ensuite

Déposer une facture réelle et lire le score, la version et les contributions.
