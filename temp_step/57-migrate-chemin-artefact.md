# Migration au démarrage

## Fait

L'image `migrate` embarque maintenant `chemin_artefact`. `docker compose up -d` passe le bootstrap et démarre l'API.

## Pourquoi

Le conteneur de migration n'a pas le montage du code. Il exécutait une copie où l'appel existait sans la fonction, et s'arrêtait avec `NameError`.

## Fichiers

- `backend/Dockerfile`

## Vérification

`docker compose up -d` se termine sans erreur. L'API démarre après `migrate`.

## Ensuite

Rien.
