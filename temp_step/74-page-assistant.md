# Page assistant

## Fait

La page `/assistant` est une conversation à part du widget flottant. Le fil défile seul, la saisie reste en bas, l'en-tête reste visible. Les conversations, le brouillon et les avis restent dans le navigateur, avec une adresse `?c=` par conversation. On peut copier, modifier, régénérer, supprimer, exporter en Markdown, épingler et archiver. L'arrêt ignore une réponse trop tardive. Les fichiers collés ou déposés s'affichent, sans être envoyés au modèle.

## Pourquoi

Le widget ne permettait pas d'étendre l'assistant. L'API répond encore en un seul bloc : il n'y a pas de flux jeton par jeton, ni de lecture des pièces jointes.

## Fichiers

- `frontend/src/app/assistant/page.tsx`
- `frontend/src/features/assistant/salon.tsx`
- `frontend/src/features/assistant/markdown.tsx`
- `frontend/src/features/assistant/stockage.ts`
- `frontend/src/features/assistant/conversation.tsx`
- `frontend/src/components/coquille.tsx`
- `frontend/src/i18n/fr.json`

## Vérification

`npx tsc --noEmit` dans `frontend`. Ouvrir `/assistant`, envoyer une question, remonter le fil, recharger la page.

## Ensuite

Brancher un vrai flux de réponse et la lecture des pièces jointes quand l'API les acceptera.
