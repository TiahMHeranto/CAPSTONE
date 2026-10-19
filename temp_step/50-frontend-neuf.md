# Frontend neuf

## Fait

L'interface temporaire a été remplacée par une application Next.js dans `frontend/src`. Quatre rôles, connexion par cookie httpOnly, file d'alertes avec anneau de score et SHAP, dépôt de facture (saisie et PDF), assistant, pilotage, réglages, modèles, supervision, comptes, identités et journal. Le service `frontend` est ajouté à `docker compose`.

## Pourquoi

Le référentiel frontend demande une coque par rôle, des tokens, et des parcours réels. Le jeton ne passe plus par le stockage du navigateur : une action serveur le pose dans un cookie.

## Fichiers

- `frontend/src/**`
- `frontend/Dockerfile`
- `frontend/next.config.ts`
- `frontend/package.json`
- `docker-compose.yml`

## Vérification

`npx tsc --noEmit` passe. Connecté en gestionnaire, `/login` ouvre `/alertes` : barre navy, trois alertes réelles, détail `FAC-MODELE-0001` avec contributions et panneau de décision.

## Ensuite

Le flux SSE de l'annexe Assistant n'existe pas encore côté API : la page appelle `POST /assistant`. Storybook, Playwright, next-intl et le client OpenAPI généré ne sont pas posés.
