# Modèle par API

## Fait

Les services `ollama` et `ollama-pull` sont retirés de Compose, ainsi que `docker-compose.gpu.yml`. L'assistant, les embeddings et la lecture d'une facture appellent une API compatible OpenAI : `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_EMBED_MODEL`. Les vecteurs restent en 768 dimensions.

## Pourquoi

Le conteneur chargeait `llama3.2` sur le processeur. Le modèle distant remplace cet appel. Sans clef, l'assistant répond qu'il est indisponible.

## Fichiers

- `docker-compose.yml`
- `backend/app/config.py`
- `backend/app/services/assistant.py`
- `backend/app/services/ocr.py`
- `n8n/workflows/ocr-extraire.js`
- `n8n/workflows/ocr-prompt.js`
- `n8n/workflows/ocr-assembler.js`
- `n8n/workflows/ocr.json`
- `backend/tests/test_ocr.py`
- `.env.example`
- `README.md`

## Vérification

`pytest backend/tests/test_ocr.py backend/tests/test_assistant.py` : 24 tests. `docker compose up -d --remove-orphans` arrête les conteneurs Ollama. Le workflow OCR est réimporté.

## Ensuite

Renseigner `LLM_API_KEY` dans `.env`, puis relancer l'indexation du corpus : les vecteurs actuels viennent de `nomic-embed-text`.
