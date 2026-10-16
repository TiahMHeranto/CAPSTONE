# 26 — Comptes rattachés

## Fait

L'administrateur crée un compte. Un rôle assuré doit citer un pseudonyme de `clean.assures`. Un rôle prestataire doit citer un établissement de `clean.prestataires`. Le gestionnaire et l'administrateur restent sans dossier.

Le jeton porte ce lien. `GET /me/profil` renvoie le nom (nom et prénoms seulement, audité) et le contrat pour l'assuré, ou le nom et le type pour le professionnel. `GET /me/factures`, `GET /me/ordonnances` et `GET /me/contrat` lisent le référentiel filtré par ce lien.

L'écran a une page Utilisateurs, un Profil, un Contrat, des Ordonnances, et la liste du dossier sur Factures.

## Pourquoi

Les quatre comptes de démonstration n'étaient rattachés à personne. Un assuré ne pouvait pas voir son nom ni son contrat.

## Fichiers

`migrations/sql/010_comptes.sql`, `migrations/versions/010_comptes.py`, `backend/app/services/comptes.py`, `backend/app/api/comptes.py`, `backend/app/api/login.py`, `backend/app/core/tokens.py`, `backend/app/services/flux.py`, `backend/tests/test_comptes.py`, `frontend/app/(espace)/profil/page.tsx`, `contrat/page.tsx`, `ordonnances/page.tsx`, `utilisateurs/page.tsx`, `factures/page.tsx`, `frontend/lib/navigation.ts`, `docs/05-api/matrice-roles.md`.

## Vérification

`pytest backend/tests/test_comptes.py backend/tests/test_flux.py` : création refusée sans lien, profil sans CIN, factures et ordonnances du lien, route de création refusée au gestionnaire. La colonne `prestataire_id` est ajoutée sur la base en cours.

## Ensuite

Les comptes déjà créés restent sans lien. Il faut en créer de nouveaux, puis se reconnecter pour que le jeton porte le pseudonyme ou l'établissement.
