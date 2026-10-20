# Boucle vers interdit

## Fait

Une session ouverte sur `/` va au tableau de bord. La page `/interdit` est autorisée pour les quatre rôles, donc elle s'affiche au lieu de se rediriger vers elle-même.

## Pourquoi

Le menu ne connaît pas `/`. Le middleware envoyait alors vers `/interdit`, qui n'était pas autorisée non plus. Le navigateur tournait en boucle.

## Fichiers

- `frontend/src/middleware.ts`
- `frontend/src/lib/rbac.ts`

## Vérification

Avec un cookie de session, `http://localhost:3000/` répond 307 vers `/tableau`. `/interdit` répond 200.

## Ensuite

Rien.
