# 06 — Préparation de la phase 5

## Fait

Le contrat du membre 1 est enregistré, sans prétendre scorer.

- Fiches copiées dans `models/baseline`, `models/v1`, `models/v2`.
- Table `app.model_registry` : algorithme, seuil métier, métriques, colonnes, empreinte du JSON, présence du fichier de poids.
- `active_model_version` vaut `mock-0.1`. Ce n'est pas le seuil d'alerte.
- `predict` reste le seul point d'entrée. `mock-0.1` répond comme avant. Demander `v2` lève `ModeleIndisponible` tant que `model.joblib` est absent, et le mock suivant répond encore.

## Pourquoi

La phase 5 doit pouvoir changer de version sans couper l'API. Les poids manquent encore, donc la bascule réelle attend le fichier.

## Fichiers principaux

`models/*/metadata.json`, `migrations/versions/004_registry.py`, `backend/app/services/registry.py`, `backend/app/services/inference.py`, `backend/app/db/bootstrap.py`.

## Vérifié

`pytest` : 24 tests passés. `ruff check` passe.

Docker Desktop n'était pas démarré, donc la table n'a pas encore été créée dans la base qui tourne. Au prochain démarrage :

```powershell
docker compose up --build -d --force-recreate migrate api
```

## Ensuite

Déposer `models/v2/model.joblib`, puis calculer les 63 variables d'une facture avec les mêmes règles que `build_features` avant d'appeler le modèle.
