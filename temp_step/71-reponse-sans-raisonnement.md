# Réponse sans le raisonnement

## Fait

Gemma 4 envoie une pensée, puis la phrase finale. L'écran ne garde que la phrase. La pensée, si elle arrive encore, est un bloc replié sous les sources. L'appel demande `thinkingLevel` `minimal`. La lecture d'une facture ignore aussi les morceaux marqués comme pensée.

## Pourquoi

Le brouillon en anglais était collé à la réponse. Llama 3.2 n'écrivait pas ce brouillon.

## Fichiers

- `backend/app/services/assistant.py`
- `backend/tests/test_assistant.py`
- `frontend/src/features/assistant/conversation.tsx`
- `frontend/src/i18n/fr.json`
- `n8n/workflows/ocr-extraire.js`
- `n8n/workflows/ocr-prompt.js`
- `n8n/workflows/ocr.json`

## Vérification

`pytest backend/tests/test_assistant.py backend/tests/test_ocr.py` : 25 tests. Une pensée marquée `thought` ne reste pas dans le texte affiché.

## Ensuite

Rien.
