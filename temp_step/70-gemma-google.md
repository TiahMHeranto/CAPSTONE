# Gemma 4 via Google AI Studio

## Fait

L'assistant, les embeddings et la lecture des factures appellent l'API Google AI Studio. Le modèle de dialogue est `gemma-4-26b-a4b-it`. Les vecteurs restent en 768 dimensions avec `gemini-embedding-001`, puis sont normalisés. La clef se met dans `LLM_API_KEY`, créée dans Google AI Studio. Elle n'est pas dans le dépôt.

## Pourquoi

Le modèle ne tourne plus sur la machine. Gemma 4 est le modèle choisi sur cette API. L'autre identifiant proposé par Google est `gemma-4-31b-it`.

## Fichiers

- `backend/app/config.py`
- `backend/app/services/assistant.py`
- `docker-compose.yml`
- `n8n/workflows/ocr-extraire.js`
- `n8n/workflows/ocr-prompt.js`
- `n8n/workflows/ocr.json`
- `.env.example`
- `README.md`

## Vérification

`pytest backend/tests/test_ocr.py backend/tests/test_assistant.py`. Le workflow contient `generateContent` et `gemma-4-26b-a4b-it`.

## Ensuite

Coller la clef Google AI Studio dans `LLM_API_KEY`, relancer la pile, puis réindexer le corpus. Les vecteurs actuels viennent de `nomic-embed-text`.
