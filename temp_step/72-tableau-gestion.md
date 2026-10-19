# Tableau de gestion

## Fait

L'espace gestionnaire et administrateur reprend la maquette : barre latérale sombre, en-tête avec le thème clair ou sombre, cartes et tableau. Les chiffres viennent des vues `bi` et de la file d'alertes. Les noms et les montants dessinés sur l'image ne sont pas repris.

## Pourquoi

L'écran devait ressembler au visuel fourni, en clair et en sombre, sans inventer une activité.

## Fichiers

- `frontend/src/components/coquille.tsx`
- `frontend/src/components/bureau-nav.tsx`
- `frontend/src/components/entete-bureau.tsx`
- `frontend/src/app/tableau/page.tsx`
- `frontend/src/app/layout.tsx`
- `frontend/src/styles/tokens.css`
- `frontend/src/i18n/fr.json`

## Vérification

`npx tsc --noEmit` dans `frontend`. Se connecter en gestionnaire, ouvrir `/tableau`, basculer le thème.

## Ensuite

Rien.
