# 29 — Rang et assuré principal dans clean.assures

## Fait

`clean.assures` reçoit `rang_beneficiaire` (ASSURE_PRINCIPAL, CONJOINT, ENFANT) et `assure_principal_id`. L'identifiant du principal est pseudonymisé avec `clean.pseudo`, comme `assure_id`. Le profil, l'annuaire de création de compte et le contexte de l'assistant exposent le rang. Le profil et l'assistant exposent aussi l'identifiant pseudonymisé du principal.

## Pourquoi

Le rang et le lien vers le principal existaient dans `raw.assures` et le CSV, mais le passage vers `clean` les oubliait. Le profil ne pouvait pas les lire.

## Fichiers

`migrations/sql/011_rang_assure.sql`, `migrations/versions/011_rang_assure.py`, `backend/app/cleaning/rebuild.py`, `backend/app/services/comptes.py`, `backend/app/services/assistant.py`, `backend/tests/test_comptes.py`, `backend/tests/test_assistant.py`, `frontend/app/(espace)/profil/page.tsx`, `STRUCTURE_BASE.txt`.

## Vérification

Les colonnes sont ajoutées sur la base en cours, puis remplies par un UPDATE depuis `raw.assures` sans vider `clean`. 4459 lignes : 1500 ASSURE_PRINCIPAL, 812 CONJOINT, 2147 ENFANT, toutes avec un assuré principal. Sur `CTR-000392`, le principal pointe vers lui-même, le conjoint et les deux enfants vers un autre pseudonyme.

`pytest tests/test_comptes.py tests/test_assistant.py` : 12 tests passés. Cache assistant vidé.

## Ensuite

Au prochain rebuild de l'image migrate, Alembic enregistrera la révision 011. Le SQL est idempotent.
