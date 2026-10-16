# 21 — Lecture isolée de la base

## Fait

Une API en lecture seule, séparée des dépôts et du score : `GET /read`, `GET /read/factures`, `GET /read/journal`, `GET /read/{schema}/{table}`. Elle pagine les lignes de `app`, `clean` et `bi`. L'écran Lecture liste les relations et affiche les pages.

Le mot de passe des comptes est masqué, les vecteurs ne sont pas renvoyés. `raw`, `labels` et `identites` restent fermés pour le compte de l'API.

## Pourquoi

Voir les factures, le journal et le reste des tables sans ouvrir un accès SQL et sans mélanger cette lecture au calcul du score.

## Fichiers

`backend/app/services/lecture.py`, `backend/app/api/lecture.py`, `frontend/app/(espace)/lecture/page.tsx`, `frontend/lib/navigation.ts`, `docs/05-api/matrice-roles.md`.

## Vérification

Sur la base en cours : 37 relations lisibles, 37 factures déposées, 5 lignes de journal, 84593 factures historiques. `raw` répond 404. Le hash des comptes vaut `[masque]`. L'assuré reçoit 403. Sans jeton, 401.

## Ensuite

Canal Slack ou e-mail réel, distribution de référence, écran dans Compose, guide par rôle.
