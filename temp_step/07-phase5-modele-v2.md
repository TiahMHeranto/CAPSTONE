# 07 — Phase 5, pipeline v2

## Fait

Le modèle retenu est le pipeline XGBoost à 28 variables, pas la fiche à 63 colonnes.

- `M1_files/.../modele_predicare_xgboost.joblib` est copié vers `models/v2/model.joblib`.
- `models/v2/metadata.json` décrit ces 28 colonnes. `baseline` et `v1` restent des fiches sans poids.
- `construire_variables` calcule les 28 champs à partir de la facture, des lignes, de l'ordonnance, du contrat, du prestataire et des factures déjà vues.
- `predict` reste le seul point d'entrée. Sans variables, il score encore avec `mock-0.1`. Avec `version="v2"` et les 28 variables, il charge le pipeline. Le retour au mock se fait dans le même processus.
- `enregistrer` écrit le score, la classe, la version et les contributions dans `app.predictions` et `app.shap_explanations`.

Le seuil d'alerte reste celui de la configuration. Le 0,729 de la fiche vient de l'entraînement à 63 variables et n'a pas été remesuré sur ce pipeline.

## Pourquoi

La phase 5 branche le modèle du membre 1 sans couper le score simulé tant que les variables ne sont pas fournies.

## Fichiers principaux

`models/v2/model.joblib`, `models/v2/metadata.json`, `backend/app/services/features.py`, `backend/app/services/inference.py`, `backend/requirements.txt`.

## Vérifié

`pytest` : 26 tests passés, 1 sauté. Le test de score réel est sauté sur Python 3.14, parce que le pipeline a été entraîné pour Python 3.12, scikit-learn 1.6.1 et XGBoost 2.1.4.

La construction de l'image a installé ces versions, puis Docker n'a pas pu écrire l'image (`input/output error` au moment de l'export). L'API qui tourne n'a donc pas encore ce pipeline. Après avoir libéré de l'espace :

```powershell
docker compose up --build -d --force-recreate migrate api
```

## Ensuite

Relier une facture déposée aux 28 variables lues dans `clean`, puis stocker l'alerte. Le dépôt de facture complet est la phase 6.
