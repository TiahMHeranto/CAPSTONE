# 04 — Pseudonymisation

## Fait

Les identités ne sont plus en clair dans la base servie.

- `identites.coffre` garde une charge chiffrée par assuré. La table `identites.identites_pii` est supprimée après le chargement.
- Dans `clean`, `assure_id` est un HMAC-SHA256. La clé est `PSEUDO_HMAC_KEY`, hors de la base. Le même identifiant redonne le même pseudonyme.
- `annee_naissance` sort des tables servies. `tranche_age` la remplace (0-17, 18-39, 40-59, 60+), calculée avec `AGE_REFERENCE_YEAR`.
- L'agent ne voit les factures que si `prediccare.assure_id` est le pseudonyme de l'assuré connecté.
- `POST /admin/reidentify` et `POST /admin/erase` exigent `X-Admin-Key`. L'audit enregistre le pseudonyme et le résultat, pas le nom.
- Le chargement s'arrête si un e-mail, un téléphone, un CIN, un nom complet ou l'identifiant source apparaît dans `clean`.

Pièces : `docs/02-conformite/` (registre, AIPD, note, droits) et `docs/05-api/matrice-roles.md`.

## Pourquoi

La phase 3 doit empêcher un nom ou une coordonnée d'atteindre le modèle, les journaux et les tables lues par l'API.

## Fichiers principaux

`migrations/versions/003_pseudo.py`, `backend/app/privacy/`, `backend/app/cleaning/rebuild.py`, `backend/app/db/bootstrap.py`, `backend/app/api/admin.py`, `docker-compose.yml`, `.env.example`.

## Vérifié

`pytest` : 22 tests passés. `ruff check` passe.

Après reconstruction de `migrate` :

- coffre : 4 459 charges, table en clair absente
- `clean.factures` : 84 593, pseudonyme sur 64 caractères
- tranches d'âge : 1 774, 1 271, 1 129, 285, aucune année de naissance dans `clean` ni `app`
- le rôle API ne lit ni le coffre ni les labels
- l'agent voit 0 facture sans pseudonyme de session, 17 avec
- sans clé admin : 401. Pseudonyme inconnu : 404. L'audit contient `{"resultat": "absent"}`

Le schéma `raw` reste l'archive des CSV, non servie. Il contient encore le nom du souscripteur.

## Ensuite

La phase 5 branchera le modèle du membre 1 à la place de `mock-0.1`. Le mock reste en place en attendant l'artefact.
