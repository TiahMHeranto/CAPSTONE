# Assistant en bouton flottant

## Fait

Le lien Assistant n'est plus dans le menu. Un bouton fixe en bas à droite ouvre la conversation dans un panneau. Échap le ferme. La route `/assistant` reste accessible.

## Pourquoi

L'assistant doit rester disponible sur chaque écran, sans occuper une entrée de navigation.

## Fichiers

- `frontend/src/components/assistant-flottant.tsx`
- `frontend/src/components/coquille.tsx`
- `frontend/src/features/assistant/conversation.tsx`
- `frontend/src/i18n/fr.json`

## Vérification

Connecté, le menu ne contient pas Assistant. Le bouton ouvre le panneau et le referme.

## Ensuite

Rien.
