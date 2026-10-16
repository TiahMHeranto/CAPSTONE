# 22 — Même corpus pour chaque rôle

## Fait

La recherche de `POST /assistant` lit les 8 fragments les plus proches dans tout `app.documents`. Le filtre `contrat_id IS NULL OR contrat_id = …` est retiré. Un assuré, un gestionnaire, un prestataire et un administrateur reçoivent donc les mêmes extraits pour la même question.

L'historique des factures reste celui de l'assuré porté par le jeton. Il n'est pas un fragment du corpus, et il n'est pas servi aux autres rôles.

## Pourquoi

Le filtre par contrat rendait les réponses différentes selon le rôle : l'assuré voyait ses conditions particulières, les autres rôles seulement les documents généraux.

## Fichiers

`backend/app/services/assistant.py`, `backend/tests/test_assistant.py`, `frontend/app/(espace)/assistant/page.tsx`.

## Vérification

`pytest backend/tests/test_assistant.py` : les quatre rôles envoient la même requête sur `app.documents`, sans `contrat_id`. Seul l'assuré déclenche la lecture de `app.factures`, avec son identifiant.

## Ensuite

Canal Slack ou e-mail réel, distribution de référence du modèle, guide par rôle, dossier FinOps.
