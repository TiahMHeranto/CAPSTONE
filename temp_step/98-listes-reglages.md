# 98 — Listes des canaux et de la version

## Ce qui a été fait

Sur Réglages, Canaux et Version active sont des listes : Webhook, E-mail, Slack, et v1, v2, v3.

## Pourquoi

Ces champs étaient du texte libre, alors que l'API n'accepte que ces valeurs.

## Fichiers

- `frontend/src/features/admin/reglages-form.tsx`
- `frontend/src/i18n/fr.json`

## Vérification

Ouvrir Réglages. Les deux champs s'ouvrent en liste. La valeur affichée est celle déjà enregistrée.

## Ensuite

Rien.
