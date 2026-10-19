# Corpus hors de l'image

## Fait

Le dossier des PDF est un chemin dans les réglages administrateur. Il est monté dans l'API, pas copié dans l'image. Au premier démarrage, si aucun fragment n'est indexé, la mise à jour part en arrière-plan. Le bouton « Mettre à jour l'assistant » relance la même indexation sans bloquer la requête.

## Pourquoi

Le corpus peut changer. Le reconstruire dans l'image à chaque modification n'est pas nécessaire : l'assistant lit les fragments déjà en base.

## Fichiers

- `backend/app/services/corpus.py`
- `backend/app/services/reglages.py`
- `backend/app/api/pilotage.py`
- `backend/app/main.py`
- `backend/app/db/bootstrap.py`
- `docker-compose.yml`
- `frontend/src/app/reglages/page.tsx`
- `frontend/src/features/admin/reglages-form.tsx`

## Vérification

`pytest backend/tests/test_corpus.py`. Dans Réglages, le chemin `/corpus` s'enregistre s'il existe dans le conteneur. Le bouton répond tout de suite.

Un dossier qui n'est pas monté dans le conteneur reste introuvable, même s'il existe sur la machine. `RAG_CORPUS_HOST` dans `.env` choisit le dossier monté, puis il faut recréer le conteneur API.

## Ensuite

Rien.
