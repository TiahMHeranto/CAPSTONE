# 43 — Webhook d'upload, extraction locale, dépôt habituel

## Ce qui a été fait

Le workflow n8n `PrediCare OCR facture` suit la chaîne demandée, sans Google Drive ni Gemini.

1. **Depot PDF** : webhook `POST /webhook/ocr`. L'écran envoie le PDF à l'API, qui le transmet au webhook (fichier en base64, ou multipart).
2. **Regrouper fichiers** : un ou plusieurs fichiers.
3. **Lire le texte** : pypdf, sinon Tesseract, via `POST /invoices/ocr/lire`.
4. **Extraction Ollama** : `llama3.2` en local structure la facture (identifiant, type, dates, montant, lignes). Pas de nom, d'adresse, de téléphone, d'e-mail ni de CIN.
5. **Parser et eclater** puis **Assembler** : un objet par facture.

L'écran remplit le formulaire. S'il y a plusieurs factures, le lot du gestionnaire reçoit la liste. Le score reste **Déposer et scorer** ou **Déposer le lot**.

## Vérification

Sur un PDF d'essai, la réponse est `200`, moteur `ollama`, facture complète `FAC-OCR-1`, une ligne. `pytest backend/tests/test_ocr.py` : 11 tests.

Ollama ne répondait pas dans Docker tant qu'il n'écoutait pas au-delà de localhost. Il a été démarré avec `OLLAMA_HOST=0.0.0.0:11434` pour que le conteneur n8n l'atteigne. Ce port n'a pas d'authentification : ne pas le publier sur Internet.

## Ensuite

Garder Ollama démarré pendant une démo. Le dépôt score toujours seulement si `models/v2/model.joblib` est présent.
