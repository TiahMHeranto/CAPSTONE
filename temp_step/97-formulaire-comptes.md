# 97 — Formulaire de compte au-dessus de la liste

## Ce qui a été fait

Le formulaire de création est au-dessus de la liste des comptes. Un identifiant ou une adresse déjà utilisés, comme les autres refus, s'affiche dans un encadré d'alerte. Plusieurs refus sont listés ensemble.

## Pourquoi

Le formulaire était sous la liste, et le refus n'était qu'une ligne de texte.

## Fichiers

- `frontend/src/app/utilisateurs/page.tsx`
- `frontend/src/features/admin/compte-form.tsx`

## Vérification

Ouvrir Utilisateurs. Le formulaire est en haut. Créer un compte avec l'identifiant `predicare` ou l'adresse `predicare@prediccare.mg` : l'encadré indique que l'identifiant ou l'adresse est déjà utilisé.

## Ensuite

Rien.
