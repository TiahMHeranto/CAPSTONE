# 37 — Réponses SQL par outils

## Fait

L'assistant choisit entre les contrats PDF et le dossier SQL. Le SQL est proposé par le modèle, validé, puis exécuté.

Un assuré ne voit que ses factures, ordonnances, son profil et son contrat. Un prestataire ne voit que les factures et ordonnances de son établissement. Un administrateur voit tout le dossier : factures, lignes, ordonnances, assurés, contrats, établissements et référentiels. Le gestionnaire n'ouvre pas le dossier d'une autre personne. Personne ne lit le coffre, `raw` ni `labels`.

Une question qui demande une liste est refusée si le SQL ne renvoie que un total. « Lister mes factures » amène l'exemple qui sélectionne l'identifiant, le statut, le montant et la date.

## Pourquoi

Le total agrégé avait répondu à une demande de liste. L'identité doit venir du jeton, et l'administrateur doit pouvoir lire l'ensemble du dossier sans CIN.

## Fichiers

`backend/app/rag/sql_guard.py`, `schema_dossier.json`, `exemples_sql.json`, `backend/app/services/assistant.py`, `backend/app/db/session.py`, `backend/app/db/bootstrap.py`, `backend/app/config.py`, `migrations/sql/015_dossier_vues.sql`, `docker-compose.yml`, `frontend/app/(espace)/assistant/page.tsx`, `docs/05-api/assistant-sql-etapes.txt`.

## Vérification

`pytest tests/test_assistant.py tests/test_sql_guard.py` : 16 tests. Sans réglage de session, 0 facture. Avec l'assuré du jeton, 17. Avec le rôle applicatif de l'administrateur, 84 630 factures et 1 500 contrats. Cache vidé.

La colonne d'âge en base est `tranche_age`, pas `annee_naissance`.

## Ensuite

L'image `api` a été reconstruite sans relancer `migrate`. Le conteneur charge `sql_guard`.
