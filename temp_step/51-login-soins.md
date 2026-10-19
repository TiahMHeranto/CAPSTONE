# Connexion au visuel soins

## Fait

La page `/login` reprend la composition demandée : illustration de dossier médical sur fond menthe à gauche, grand titre « Plateforme de soins de santé » et formulaire sur fond teal à droite.

## Pourquoi

L'écran de connexion doit se reconnaître au premier regard comme une plateforme de soins, avant la saisie des identifiants.

## Fichiers

- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/app/(auth)/login/scene.tsx`
- `frontend/src/app/(auth)/login/formulaire.tsx`
- `frontend/src/styles/tokens.css`
- `frontend/src/app/globals.css`
- `frontend/src/i18n/fr.json`

## Vérification

Déconnecté, `http://localhost:3000/login` affiche les deux panneaux, le titre, les champs Identifiant et Mot de passe, et le bouton Entrer. Le texte du modèle PowerPoint n'est pas repris.

## Ensuite

Rien sur les autres écrans.
