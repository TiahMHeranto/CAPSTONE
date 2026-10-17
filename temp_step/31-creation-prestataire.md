# 31 — Création d'ordonnance et de facture par le professionnel

## Fait

Un compte prestataire rattaché peut créer une ordonnance pour un assuré choisi par son nom. La facture se dépose ensuite pour cet assuré. L'ordonnance est une liste déroulante des ordonnances de cette personne, ou « Sans ordonnance ». L'établissement facturant est celui du jeton, pas un identifiant saisi.

L'écriture passe par `app.creer_ordonnance`, car l'API n'a que le droit de lire `clean`.

## Pourquoi

Le dépôt existant demandait des pseudonymes. Le professionnel ne les connaît pas, et il n'y avait pas d'écran pour créer l'ordonnance avant la facture.

## Fichiers

`migrations/sql/012_creer_ordonnance.sql`, `migrations/versions/012_creer_ordonnance.py`, `backend/app/db/bootstrap.py`, `backend/app/schemas/flux.py`, `backend/app/services/comptes.py`, `backend/app/services/referentiel.py`, `backend/app/api/comptes.py`, `backend/app/api/invoices.py`, `frontend/app/(espace)/ordonnances/page.tsx`, `frontend/app/(espace)/factures/page.tsx`, `backend/tests/test_comptes.py`, `docs/05-api/matrice-roles.md`.

## Vérification

`pytest tests/test_comptes.py tests/test_flux.py tests/test_invoices.py tests/test_roles.py` : 74 tests passés. Le prescripteur enregistré est celui du jeton. Une facture rattachée ignore un autre établissement saisi, et accepte une ordonnance vide.

La fonction a été installée sur la base en cours. Un insert d'essai a été annulé. `prediccare_app` peut l'exécuter.

## Ensuite

Un rebuild de l'image migrate enregistrera la révision 012. La fonction est déjà en place.
