# Même coquille pour tous les rôles

## Fait

L'assuré et le prestataire utilisent la même barre latérale et le même en-tête que la gestion, en clair et en sombre. Le libellé change : espace assuré, espace professionnel, espace de gestion. Toutes les pages connectées passent par cette coquille. Les cartes de l'assuré suivent le fond du thème.

## Pourquoi

La maquette ne devait pas rester réservée au gestionnaire.

## Fichiers

- `frontend/src/components/coquille.tsx`
- `frontend/src/components/bureau-nav.tsx`
- `frontend/src/components/entete-bureau.tsx`
- `frontend/src/app/tableau/page.tsx`
- `frontend/src/features/assistant/conversation.tsx`
- `frontend/src/i18n/fr.json`

## Vérification

`npx tsc --noEmit` dans `frontend`. Se connecter en assuré, en prestataire, puis ouvrir une autre page et basculer le thème.

## Ensuite

Rien.
