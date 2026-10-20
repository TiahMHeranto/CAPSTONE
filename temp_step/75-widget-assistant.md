# Widget assistant

## Fait

Le bouton flottant ouvre la même conversation que la page `/assistant`. Le fil défile seul, la saisie grandit, Entrée envoie et Maj+Entrée passe à la ligne. L'arrêt, les sources, la copie et le brouillon sont les mêmes. La discussion reste sur cet appareil et se retrouve sur la page.

## Pourquoi

Le widget gardait une zone de texte sur une seule ligne, séparée de la page.

## Fichiers

- `frontend/src/components/assistant-flottant.tsx`
- `frontend/src/features/assistant/salon.tsx`

## Vérification

`npx tsc --noEmit` dans `frontend`. Sur une page autre que `/assistant`, ouvrir le bouton Assistant, écrire deux lignes, envoyer, puis rouvrir la page Assistant.

## Ensuite

Rien.
