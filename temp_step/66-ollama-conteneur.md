# Ollama dans la pile

## Fait

`docker compose up` démarre Ollama et, au premier passage, télécharge `llama3.2` et `nomic-embed-text`. L'API et n8n les appellent à `http://ollama:11434`. Ce port n'est pas publié.

## Pourquoi

Après un clone, l'assistant et la lecture des factures ne doivent pas dépendre d'un Ollama installé à part. Le CPU suffit. Un GPU NVIDIA s'ajoute avec `docker-compose.gpu.yml`, sans changer le protocole.

## Fichiers

- `docker-compose.yml`
- `docker-compose.gpu.yml`
- `.env.example`
- `README.md`
- `n8n/workflows/ocr.json`
- `n8n/workflows/ocr-extraire.js`

## Vérification

`docker compose up --build`. `ollama-pull` se termine, puis l'API devient saine. La mise à jour de l'assistant peut alors indexer.

## Ensuite

Rien.
