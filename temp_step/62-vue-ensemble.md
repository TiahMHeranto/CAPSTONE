# Vue d'ensemble assuré

## Fait

La page `/tableau` de l'assuré reprend la maquette : barre avec « Vue d'ensemble », salutation, trois compteurs, tableaux des dernières factures et ordonnances, carte contrat et carte pour ouvrir l'assistant. Le bouton flottant est la pastille « Assistant ».

## Pourquoi

L'écran était une liste de blocs, pas la vue d'ensemble demandée.

## Fichiers

- `frontend/src/app/tableau/page.tsx`
- `frontend/src/app/layout.tsx`
- `frontend/src/components/coquille.tsx`
- `frontend/src/components/entete-personnel.tsx`
- `frontend/src/components/carte-assistant.tsx`
- `frontend/src/components/assistant-flottant.tsx`
- `frontend/src/features/assistant/conversation.tsx`
- `frontend/src/lib/nom.ts`
- `frontend/src/i18n/fr.json`

## Vérification

Connexion `assure`, ouverture de `/tableau`. Le compte de démonstration n'est pas lié à un contrat : le nom, le contrat et les compteurs restent vides, sans données inventées. « Ouvrir l'assistant » ouvre le panneau.

## Ensuite

Rien.
