# Assistant flottant, maquette

## Fait

Le bouton est une pastille ronde. Fermé, une carte propose « Discuter » et « Questions ». Ouvert, le panneau a un bandeau, la date, les bulles et un envoi rond. La croix referme le panneau.

## Pourquoi

Le bouton texte ne correspondait pas à la maquette du widget.

## Fichiers

- `frontend/src/components/assistant-flottant.tsx`
- `frontend/src/features/assistant/conversation.tsx`
- `frontend/src/i18n/fr.json`

## Vérification

Sur une page connectée, la pastille est en bas à droite. « Discuter » ouvre le bandeau vert. « Questions » liste les quatre suggestions. L'API était arrêtée : l'envoi affiche le message d'échec, sans bloquer la page.

## Ensuite

Rien.
