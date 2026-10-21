# 96 — Ollama de la machine en secours

## Ce qui a été fait

Le repli existait déjà : si l'API Google refuse l'embedding ou la réponse, l'assistant appelle `nomic-embed-text` puis `llama3.2`. Cette adresse visait le service Compose `ollama`.

Les services `ollama` et `ollama-pull` sont retirés. L'API et n8n appellent `http://host.docker.internal:11434`, l'Ollama déjà installé sur la machine. Les modèles `llama3.2` et `nomic-embed-text` y sont présents.

## Pourquoi

Le quota d'embedding Google répond 429. Le secours ne doit pas démarrer un second Ollama dans Docker.

## Fichiers

- `docker-compose.yml`
- `backend/app/config.py`
- `.env.example`
- `n8n/workflows/ocr-extraire.js`
- `n8n/workflows/ocr.json`
- `docs/livrables/02-guide-exploitation.md`
- `docs/04-workflow/fiche-ocr.md`

## Vérification

Depuis le conteneur API, `http://host.docker.internal:11434/api/tags` liste `llama3.2` et `nomic-embed-text`. Une question assistant répond alors que l'embedding Google est refusé.

## Ensuite

Rien.
