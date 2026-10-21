# 92 — Corpus : nouveau chemin et index à jour

## Ce qui a été fait

Après un changement de documents, la mise à jour de l'assistant repart du dossier choisi et oublie l'ancien contenu.

- Parcourir un dossier enregistre ses PDF sous `/corpus/<dossier>` et retient ce chemin dans `app.settings` (`rag_corpus_path`). L'écran Réglages affiche ce chemin, y compris pendant et après la mise à jour.
- L'indexation retire les fragments des PDF qui ne sont plus dans ce dossier, réécrit les fragments des PDF présents, puis vide `app.assistant_cache` pour ne pas resservir une réponse d'avant le changement.
- Le rôle `prediccare_app` reçoit le droit `DELETE` sur ce cache (migration `019`).

## Pourquoi

Le chemin restait affiché sur `/corpus` et ne changeait pas. Une réindexation laissait les anciens documents et les réponses en cache, donc l'assistant continuait de citer l'ancien corpus.

## Fichiers

- `backend/app/services/corpus.py`
- `backend/app/rag/index.py`
- `backend/tests/test_corpus.py`
- `frontend/src/features/admin/reglages-form.tsx`
- `migrations/sql/019_cache_effacement.sql`
- `migrations/versions/019_cache_effacement.py`

## Vérification

`pytest tests/test_corpus.py` : 5 tests passés. Dans Réglages, Parcourir un dossier de PDF : le chemin affiché devient `/corpus/<dossier>`, puis le statut passe à terminé. Une question déjà posée est recalculée, elle ne reprend plus l'ancienne réponse.

## Ensuite

La migration `019` est appliquée à la main sur la base en cours (`GRANT DELETE`). Le prochain `docker compose up` qui relance `migrate` la rejoue sans effet supplémentaire.
