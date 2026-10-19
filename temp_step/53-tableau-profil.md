# Tableau de bord par profil

## Fait

Chaque rôle arrive sur `/tableau`. La page montre le profil (nom, contrat, formule actuelle), puis les volumes utiles : factures et ordonnances pour l'assuré et le professionnel, remboursements pour l'assuré, alertes, volumes, décisions, montants économisés et taux de détection pour le gestionnaire et l'administrateur. L'administrateur voit aussi le volume scoré, les erreurs, la latence et la dérive.

## Pourquoi

Les pages d'arrivée étaient des listes de travail (remboursements, dépôt, alertes, supervision), sans vue d'ensemble du compte.

## Fichiers

- `frontend/src/app/tableau/page.tsx`
- `frontend/src/i18n/fr.json`
- `frontend/src/lib/session.ts`
- `frontend/src/lib/rbac.ts`
- `frontend/src/middleware.ts`
- `frontend/src/components/coquille.tsx`

## Vérification

Après connexion, l'écran est `/tableau`. Le gestionnaire y voit 37 volumes, 3 alertes et un taux de détection. Le compte démo `assure` n'est pas rattaché à un contrat : le nom et la formule restent vides, et les compteurs sont à zéro.

## Ensuite

Rien.
