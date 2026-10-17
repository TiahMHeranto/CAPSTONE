# Tableau de bord Superset

## Fait

Le dossier `dashboard/` construit une image Superset 4.1.4. Le service `superset` du Compose démarre avec `docker compose up`. Au premier passage il crée le compte d'écran, initialise les rôles, et enregistre la source « PrediCare BI ». Cette source utilise `prediccare_bi` et refuse les écritures. Les métadonnées de Superset (compte, source) restent dans le volume `superset_home`.

## Pourquoi

Le schéma `bi` existait déjà en lecture seule. Le gestionnaire n'avait pas d'écran pour le consulter en dehors de `GET /bi`. Superset s'ajoute à la pile sans ouvrir `app`, `clean`, `identites` ni `labels`.

## Fichiers

- `dashboard/Dockerfile`
- `dashboard/entree.sh`
- `dashboard/superset_config.py`
- `dashboard/brancher_bi.py`
- `docker-compose.yml`
- `.env.example`
- `README.md`
- `docs/06-exploitation/guide.md`

## Vérification

`docker compose up -d --no-deps --build superset`. Le conteneur passe `healthy`. `GET /health` sur le port 8088 répond. La source « PrediCare BI » lit `bi.volumes` (37 factures, 37 prédictions au moment de l'essai). Les vues disponibles sont `bi.volumes`, `bi.alertes_par_statut`, `bi.decisions_humaines` et `bi.distribution_scores`. L'écran est `http://localhost:8088`. Le mot de passe d'écran est `SUPERSET_ADMIN_PASSWORD`.

## Ensuite

Créer les jeux de données et les graphiques dans l'écran, à partir de ces quatre vues. Aucun graphique n'est encore enregistré.
