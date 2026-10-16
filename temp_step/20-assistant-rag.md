# 20 — Assistant sur les contrats

## Fait

Les PDF de `CohorteAI_datagen/rag_corpus` sont découpés et indexés dans `app.documents` (184 fragments, vecteurs de 768 dimensions, modèle `nomic-embed-text`). `POST /assistant` interroge Ollama `llama3.2`, cite les documents, refuse une question hors périmètre et reprend une question proche depuis `app.assistant_cache`.

Un assuré ne reçoit que les contrats généraux et les conditions particulières de son contrat. L'historique lu est celui du pseudonyme porté par le jeton. Le diagnostic, les labels et les identités ne sont pas indexés.

## Pourquoi

Le cahier demande un assistant sourcé sur les garanties et le dossier de l'assuré connecté, avec un filtre d'injection et un cache sémantique.

## Fichiers

`migrations/sql/009_assistant.sql`, `migrations/versions/009_assistant.py`, `backend/app/rag/`, `backend/app/services/assistant.py`, `backend/app/api/assistant.py`, réglages Ollama dans la configuration et Compose, page `frontend/app/(espace)/assistant/page.tsx`.

## Vérification

Question gestionnaire sur le plafond de la formule Essentiel : réponse 3 000 000 Ar, source `Conditions_Generales_ESSENTIEL.pdf`. La même question ensuite vient du cache. Une question qui demande d'ignorer les instructions répond 422 `QUESTION_REFUSEE`.

Le SQL a été appliqué sur la base en cours. L'image `migrate` ne contient pas encore ce fichier : un volume vierge demande `docker compose build migrate api`. `pypdf` est dans `requirements.txt` ; le conteneur actuel l'a reçu par `pip install`. Une image neuve le prend au build. Réindexer : `python -m app.rag.index` dans le conteneur, corpus monté sur `/corpus`.

## Ensuite

Canal Slack ou e-mail réel, distribution de référence du modèle, écran dans Compose, guide par rôle, dossier FinOps.
