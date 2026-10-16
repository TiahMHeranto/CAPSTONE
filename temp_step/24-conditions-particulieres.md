# 24 — Conditions particulières réservées

## Fait

La recherche de l'assistant ne lit les fragments dont `contrat_id` est renseigné que pour deux cas : l'administrateur, qui voit tout le corpus, et l'assuré, qui ne voit que les conditions particulières de son contrat (lu dans `clean.assures` à partir du jeton). Le gestionnaire et le prestataire restent sur les documents communs, ceux dont `contrat_id` est vide.

Les PDF de `CohorteAI_datagen/rag_corpus/conditions_particulieres` portent déjà ce `contrat_id` à l'indexation (`CP_CTR-000638.pdf` devient `CTR-000638`).

## Pourquoi

Ces pièces décrivent un contrat précis. Elles ne doivent pas sortir vers un autre rôle, ni vers un autre assuré.

## Fichiers

`backend/app/services/assistant.py`, `backend/tests/test_assistant.py`, `frontend/app/(espace)/assistant/page.tsx`.

## Vérification

`pytest backend/tests/test_assistant.py`. Le gestionnaire et le prestataire filtrent `contrat_id IS NULL`. L'administrateur n'a pas ce filtre. L'assuré `ASS-1` est limité à `CTR-000638`.

Les réponses déjà en cache datent d'avant ce filtre. Les vider : `docker compose exec db psql -U prediccare -d prediccare -c "TRUNCATE app.assistant_cache;"`.

## Ensuite

Canal Slack ou e-mail réel, distribution de référence du modèle, guide par rôle, dossier FinOps.
