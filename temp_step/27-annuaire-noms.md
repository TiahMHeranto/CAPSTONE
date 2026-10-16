# 27 — Choix par le nom

## Fait

La création d'un compte assuré ou professionnel propose une liste déroulante de noms. La valeur envoyée reste `assure_id` ou `prestataire_id`. Les noms d'assurés sont lus dans le coffre, sans CIN. Les noms d'établissements viennent de `clean.prestataires`.

## Pourquoi

L'administrateur ne connaît pas les pseudonymes. Il reconnaît une personne par son nom.

## Fichiers

`migrations/sql/010_comptes.sql`, `backend/app/services/comptes.py`, `backend/app/api/comptes.py`, `backend/app/db/bootstrap.py`, `frontend/app/(espace)/utilisateurs/page.tsx`, `backend/tests/test_comptes.py`.

La première lecture échouait : `clean.assures` n'a pas de colonne `rang_beneficiaire`. La liste utilise la ville à la place.

## Vérification

`pytest backend/tests/test_comptes.py` : l'annuaire assuré renvoie « Aina Rabe » et le pseudonyme, sans le CIN. La fonction `identites.lire_annuaire` est créée sur la base en cours.

## Ensuite

Ouvrir Utilisateurs en administrateur et choisir un nom dans la liste.
