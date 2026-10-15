# 11 — Phase 9, vues du tableau de bord

## Fait

Les quatre rôles étaient déjà refusés au mauvais endroit, le gestionnaire pouvait déjà enregistrer une décision, et le changement de seuil écrivait déjà l'audit. Cette étape ajoute ce qui manquait pour le membre 3 : des vues en lecture, et la route qui les sert.

- Schéma `bi` : `volumes`, `alertes_par_statut`, `decisions_humaines`, `distribution_scores`.
- Ces vues portent des effectifs, le canal, le statut d'envoi, la décision humaine, le score et la version. Elles ne lisent ni `labels`, ni `identites`.
- Compte `prediccare_bi` en lecture seule sur ce schéma. L'API lit les mêmes vues via `GET /bi` (gestionnaire, administrateur).
- Le seuil d'alerte reste celui de `app.settings`. Le passage à 0,79 puis le retour ont laissé deux lignes d'audit : auteur, ancienne valeur, nouvelle valeur, horodatage. Le seuil actif est de nouveau la valeur configurée.

## Pourquoi

Le tableau de bord du membre 3 doit lire des chiffres sans ouvrir les factures, les labels ou le coffre d'identités. Une alerte du modèle reste un signal : la vue des décisions est séparée, et seul le gestionnaire peut en écrire une.

## Fichiers

- `migrations/sql/007_bi.sql`, `migrations/versions/007_bi.py`
- `backend/app/services/bi.py`, `backend/app/api/pilotage.py`
- `backend/app/config.py`, `backend/app/db/bootstrap.py`, `docker-compose.yml`, `.env.example`
- `backend/tests/test_bi.py`, `backend/tests/test_roles.py`, assertion d'audit dans `test_flux.py`
- `docs/05-api/matrice-roles.md`, `contrat-donnees.md`, `openapi.md`, `README.md`

## Vérification

- `ruff check` sur `backend` et `migrations`.
- pytest : 78 tests passent, 1 est ignoré (score v2 sur Python 3.14, réservé au conteneur).
- Base en marche : `prediccare_bi` lit `bi.volumes` (4 factures, 4 prédictions, 2 alertes modèle, 2 notifications, 0 décision). Lecture de `app`, `labels` et `identites` refusée.
- `GET /bi` : 401 sans jeton, 403 prestataire et assuré, 200 gestionnaire. Le seuil est revenu à sa valeur d'avant l'essai.

La migration `007_bi` est dans le dépôt. Elle a été appliquée sur la base actuelle. Au prochain build de l'image, Alembic rejoue `CREATE OR REPLACE` : les vues restent les mêmes. La version Alembic enregistrée n'a pas été avancée à la main, pour que ce prochain passage l'applique lui-même.

## Ensuite

Phase 10 : sauvegarde, restauration, dérive, retour arrière, guide d'exploitation. Aucune décision humaine n'a été posée sur les factures déjà scorées ; la vue `decisions_humaines` est donc vide tant qu'un gestionnaire n'en enregistre pas.
