# 95 — Ollama en secours

## Ce qui a été fait

L'assistant appelle d'abord l'API Google. Si l'embedding ou la réponse échoue, il passe sur Ollama : `nomic-embed-text` pour le vecteur, `llama3.2` pour la réponse, le choix d'outil et le SQL. La lecture d'un PDF fait le même repli.

Les services `ollama` et `ollama-pull` reviennent dans Compose. Le port 11434 n'est pas publié. L'API ne les attend pas pour démarrer : le téléchargement des modèles se fait à côté.

## Pourquoi

Le quota gratuit de `gemini-embedding-001` répond 429. L'écran affichait alors que l'assistant est indisponible, alors que `llama3.2` savait déjà répondre en local.

## Fichiers

- `backend/app/services/assistant.py`
- `backend/app/config.py`
- `backend/tests/test_repli_ollama.py`
- `docker-compose.yml`
- `n8n/workflows/ocr-extraire.js`
- `n8n/workflows/ocr.json`
- `.env.example`

## Vérification

`pytest backend/tests/test_repli_ollama.py backend/tests/test_assistant.py backend/tests/test_ocr.py`

`docker compose up -d ollama ollama-pull`, puis reconstruire l'API. `docker compose exec ollama ollama list` montre `llama3.2` et `nomic-embed-text`. Une question assistant répond même quand l'embedding Google est refusé.

## Ensuite

Le corpus encore indexé avec `nomic-embed-text` correspond au repli. Quand le quota Google revient, réindexer si la recherche doit de nouveau utiliser `gemini-embedding-001`.
