# 16 — Écran temporaire Next.js

## Fait

Dossier `frontend/`, application Next.js qui parcourt les routes déjà en service : connexion, factures, score, alertes, synthèse, pilotage, réglages, remboursements, identités.

Le navigateur appelle `/backend/...`. Next relaie vers l'API sur le port 8000. Aucun CORS n'a été ajouté à l'API.

## Pourquoi

Voir les quatre parcours sans attendre les écrans définitifs. Le dossier est temporaire.

## Fichiers

`frontend/` : pages, coquille, relais dans `next.config.ts`.

## Vérification

`npm run dev` dans `frontend`, puis ouvrir http://localhost:3000. Mot de passe : la valeur de `AUTH_DEMO_PASSWORD`.

## Ensuite

Les écrans définitifs et l'assistant restent à brancher quand la route correspondante existera.
