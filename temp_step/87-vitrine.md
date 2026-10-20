# Vitrine d'accueil

## Fait

`http://localhost:3000` affiche une page d'accueil avant la connexion. Les textes reprennent le cahier et l'application : contrôle des factures, explications, assistant, décision humaine, données synthétiques, rappel et précision du modèle v2 sur son jeu de test. Le montant économisé reste celui des rejets confirmés.

## Pourquoi

L'adresse d'entrée renvoyait vers la connexion. La maquette demandait une vitrine, sans chiffre qui ne soit pas dans le dépôt ou le cahier.

## Fichiers

- `frontend/src/app/page.tsx`
- `frontend/src/middleware.ts`
- `frontend/src/app/layout.tsx`
- `frontend/src/i18n/fr.json`
- `docs/livrables/01-guide-utilisateur.md`

## Vérification

Sans cookie, `/` répond 200 et ne redirige pas vers `/login`. « Se connecter » ouvre la connexion. Avec une session, le même bouton ouvre le tableau de bord.

## Ensuite

Reconstruire l'image frontend.
