# Compte administrateur unique

## Fait

La migration 018 retire les comptes de démonstration et crée l'administrateur `predicare`. Le démarrage ne recrée plus les quatre comptes. Les guides disent de créer les autres utilisateurs dans l'écran.

## Pourquoi

Un seul accès au départ, puis les rôles se créent par l'administrateur.

## Fichiers

- `migrations/sql/018_compte_initial.sql`
- `migrations/versions/018_compte_initial.py`
- `backend/app/db/bootstrap.py`
- `backend/app/config.py`
- `docker-compose.yml`
- `.env.example`
- `README.md`
- `docs/livrables/01-guide-utilisateur.md`
- `docs/livrables/02-guide-exploitation.md`
- `docs/livrables/07-support-soutenance.md`
- `docs/06-exploitation/guide.md`
- `docs/05-api/openapi.md`
- `UTILISATEURS.txt`

## Vérification

`migrate` se termine sans erreur. La connexion `predicare` ouvre l'écran Utilisateurs. Les anciens identifiants ne se connectent plus.

## Ensuite

Rien. Les PDF des livrables ont été régénérés. La connexion `predicare` répond, l'ancien identifiant `administrateur` est refusé.
