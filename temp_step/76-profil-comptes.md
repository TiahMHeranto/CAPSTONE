# Fiche de compte

## Fait

Le profil affiche le compte connecté : identifiant, adresse, date de création, état, et la personne ou le contrat quand le rôle en a un. La création d'un compte demande une adresse. Un assuré ou un professionnel se choisit dans la liste du référentiel. Un compte retiré reste en base (`is_deleted`) et ne peut plus se connecter.

## Pourquoi

Le profil ne montrait que le rôle. Le rattachement se saisissait à la main, sans adresse ni date.

## Fichiers

- `migrations/sql/017_compte_fiche.sql`
- `migrations/versions/017_compte_fiche.py`
- `backend/app/services/comptes.py`
- `backend/app/api/comptes.py`
- `backend/app/api/login.py`
- `backend/app/schemas/flux.py`
- `backend/app/db/bootstrap.py`
- `backend/tests/test_comptes.py`
- `frontend/src/app/profil/page.tsx`
- `frontend/src/app/utilisateurs/page.tsx`
- `frontend/src/features/admin/compte-form.tsx`
- `frontend/src/features/admin/supprimer-compte.tsx`
- `frontend/src/features/admin/api.ts`
- `frontend/src/i18n/fr.json`

## Vérification

`pytest tests/test_comptes.py` : 11 tests. La colonne est en base. Ouvrir Profil, puis Comptes en administrateur.

## Ensuite

Rien.
