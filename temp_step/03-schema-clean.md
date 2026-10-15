# 03 — Schéma clean et validation

## Fait

Le schéma `clean` est reconstruit depuis `raw` à chaque passage du service `migrate`. Le schéma `raw` n'est pas modifié. Les labels et les identités ne sont pas lus.

- Migration `002_clean` : tables typées sans clés étrangères, plus `clean.anomalies`.
- Une facture ou une ligne illisible, en doublon, ou à montant négatif est exclue et tracée avec la décision `rejet`.
- Un lien manquant, un code hors référentiel, un écart de somme ou des dates dans le mauvais ordre gardent la ligne et ajoutent une décision `conservation`.
- `POST /invoices/validate` réutilise les mêmes règles. Une facture invalide répond `422` avec un code et un motif. Un corps mal typé répond aussi `422`, jamais `500`.
- Le rôle de l'API peut lire `clean`. Il ne peut toujours pas lire `labels`.

## Pourquoi

La sortie de la phase 2 est un script unique qui reconstruit `clean`, et des tests de validation qui passent sur un exemple dégradé.

## Fichiers principaux

`migrations/versions/002_clean.py`, `backend/app/cleaning/rebuild.py`, `backend/app/cleaning/validate.py`, `backend/app/api/invoices.py`, `backend/app/db/bootstrap.py`, `backend/tests/test_validate.py`, `backend/tests/test_invoices.py`, `README.md`.

## Vérifié

`pytest` : 14 tests passés. `ruff check` et `ruff format --check` passent.

Après `docker compose up --build -d --force-recreate migrate api` :

- `raw.factures` 84 593, `clean.factures` 84 593, `clean.lignes_facture` 123 270, `clean.referentiel_actes` 58, `clean.assures` 4 459
- `clean.anomalies` : 0 ligne. Le jeu synthétique respecte déjà ces règles. Le registre est en place pour un lot qui ne les respecte pas.
- aucune colonne `est_fraude` dans `clean`
- `GET /health` : ok
- le rôle API lit 58 actes et 28 médicaments, et reçoit `InsufficientPrivilege` sur `labels`
- facture dégradée : `422` avec `MONTANT_NEGATIF`, `DATES_INCOHERENTES`, `CODE_INCONNU`
- facture cohérente (`CONS-CARDIO`) : `200` et `valide: true`

## Ensuite

Phase 3 : chiffrer les identités et pseudonymiser. Le lot de 20 factures inédites du jury reste à préparer quand le parcours de dépôt existera.
