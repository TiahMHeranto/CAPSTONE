# 02 — Socle M2

## Fait

La pile de base est dans le dépôt, sans routes métier.

- PostgreSQL + pgvector, API FastAPI et n8n dans `docker-compose.yml`. Le frontend et le BI ne sont pas lancés : ces services n'existent pas encore.
- Migrations Alembic : schémas `raw`, `identites`, `labels` et `app` (tables métier, prédictions, SHAP, décisions, documents vectorisés, audit, réglages).
- Au premier démarrage, le service `migrate` charge les CSV. Les identités et les labels sont dans des schémas à part. Le rôle de l'API n'y a pas accès. La table d'identités n'est pas encore chiffrée : c'est la phase 3.
- `GET /health` répond, et passe à 503 si la base est injoignable.
- Fonction de prédiction simulée `mock-0.1`. Le seuil d'alerte lui est passé en argument. La valeur d'exemple est écrite dans `app.settings` au premier chargement, depuis `ALERT_THRESHOLD`.
- Sauvegarde et restauration : `db/backup/backup.sh` et `restore.sh`.
- CI : lint, pytest, build de l'image API.

## Pourquoi

Le membre 2 peut avancer sans le modèle réel. La sortie visée de cette étape est `docker compose up` puis `/health`.

## Fichiers principaux

`docker-compose.yml`, `.env.example`, `backend/`, `migrations/`, `db/`, `alembic.ini`, `README.md`, `.github/workflows/ci.yml`.

## Vérifié

`pytest` : 5 tests passés. `ruff check` passe.

`docker compose up --build` a abouti après le dégagement d'espace disque. Le premier chargement CSV échouait : l'envoi vers PostgreSQL n'était pas au format CSV. Corrigé dans `backend/app/db/seed.py`. L'image n8n `1.109.1` était illisible (script d'entrée vide) ; la pile utilise maintenant `n8nio/n8n:1.114.0`.

Contrôles :

- `GET /health` renvoie `status: ok` et `model_version: mock-0.1`
- `raw.factures` : 84 593 lignes, labels : 84 593, identités : 4 459
- le rôle de l'API reçoit `permission denied` sur le schéma `identites`
- après redémarrage de la base et de l'API, `/health` répond encore et les factures sont toujours là

## Ensuite

Phase 2 : produire le schéma `clean` depuis `raw`, tracer les anomalies, et réutiliser ces règles pour rejeter une facture invalide dans l'API.
