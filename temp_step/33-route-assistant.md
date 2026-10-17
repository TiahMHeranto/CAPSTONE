# 33 — L'assistant choisit le dossier ou les contrats

## Fait

Avant de chercher, la question est classée. « Facture », « remboursement », « où en est » lisent le SQL du compte connecté (`clean.factures` et `app.factures`). « Plafond », « carence », « formule », « à fournir » lisent les PDF. Si les deux familles de mots sont présentes, les deux sources sont lues. Sinon, seule la base vectorielle l'est.

L'identifiant vient du jeton : l'assuré sur `assure_id`, le prestataire sur `prestataire_id`. Le gestionnaire et l'administrateur n'ouvrent pas le dossier d'une autre personne. Le cache est séparé par cette intention.

## Pourquoi

Chaque question lisait les PDF et, pour un assuré, seulement `app.factures`. Une question de dossier ne voyait pas l'historique déjà en base, et une question de garantie embarquait quand même des factures.

## Fichiers

`backend/app/rag/route.py`, `backend/app/services/assistant.py`, `backend/tests/test_assistant.py`, `migrations/sql/013_cache_intention.sql`, `migrations/versions/013_cache_intention.py`, `frontend/app/(espace)/assistant/page.tsx`.

## Vérification

`pytest tests/test_assistant.py` : 12 tests passés. « où en est ma facture de ASS-999 » lit `ASS-1`, pas l'identifiant écrit dans la question. Une question de plafond ne lit pas les factures. La colonne `intention` est en place et le cache a été vidé.
