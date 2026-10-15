# 08 — Phase 6, API sur le mock

## Fait

Le dépôt d'une facture passe par l'API, d'abord avec `mock-0.1`.

- `POST /auth/login` délivre un jeton aux quatre rôles. Chaque route métier refuse un rôle interdit.
- `POST /invoices` et `POST /invoices/batch` valident, scorent, stockent la prédiction et les contributions. Une facture invalide répond avec un code et un motif, plus une ligne d'audit. Elle ne produit pas de score.
- Le seuil, les canaux, l'URL n8n et la version active sont lus dans `app.settings`. Un changement vaut pour l'appel suivant.
- Si la classe est `alerte` et qu'une URL est configurée, l'API appelle le webhook. L'échec de cet appel ne fait pas échouer le score.
- Le gestionnaire lit la file d'alertes, le rapport de contributions, et enregistre `valider`, `rejeter` ou `complement`.
- L'assuré ne voit que les factures de son pseudonyme. `GET /metrics` expose volume, erreurs, latence et distribution des scores.

La version active reste `mock-0.1`. Si on la passe à `v2`, les 28 variables sont calculées puis envoyées à `predict`. Sans poids chargeable, la réponse est `503` `MODELE_INDISPONIBLE`, pas un score silencieux.

## Pourquoi

La phase 6 devait faire circuler une facture de bout en bout avant que l'image du modèle soit reconstruite.

## Fichiers

`backend/app/api/invoices.py`, `login.py`, `pilotage.py`, `backend/app/services/flux.py`, `migrations/versions/005_flux.py`, `docs/05-api/contrat-donnees.md`, `docs/05-api/openapi.md`, `docs/05-api/matrice-roles.md`.

## Vérifié

`pytest` : 45 tests passés, 1 sauté (score v2 sur Python 3.14). Lint `ruff` sans erreur.

L'image Docker n'a pas été reconstruite. La table `app.utilisateurs` et la colonne `duree_ms` arrivent avec la migration `005_flux`. Tant que `migrate` n'a pas été relancé sur cette image, le login et le dépôt répondent `503`.

```powershell
docker compose up --build -d --force-recreate migrate api
```

## Ensuite

Phase 7 : le workflow n8n importé, branché sur l'URL déjà stockée. Le score `v2` se teste dans le conteneur Python 3.12 une fois l'image écrite.
