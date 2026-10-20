# Écrans alignés sur le cahier

## Fait

Le menu ne montre plus les pages absentes des parcours du cahier : garanties, catalogue d'ordonnances, lecture brute, liste des décisions et journal des notifications. Ces adresses renvoient au tableau de bord. Les libellés « dossier » du tableau parlent de factures. L'assuré voit ses factures, ses remboursements et l'assistant.

## Pourquoi

Le cahier demande le contrôle des factures, les alertes, l'assistant, les remboursements et le pilotage. Les autres écrans ajoutaient un contenu qui n'est pas un parcours.

## Conservé

Profil, comptes, dépôt avec scan, réglages, supervision, modèles et identités. Ce sont le socle administrateur ou des demandes déjà en place.

## Fichiers

- `frontend/src/lib/rbac.ts`
- `frontend/src/middleware.ts`
- `frontend/src/i18n/fr.json`
- `frontend/src/app/tableau/page.tsx`
- `frontend/src/app/garanties/page.tsx`
- `frontend/src/app/lecture/page.tsx`
- `frontend/src/app/decisions/page.tsx`
- `frontend/src/app/ordonnances/page.tsx`
- `frontend/src/app/audit/page.tsx`

## Vérification

Connecté en gestionnaire : le menu n'a plus Lecture, Décisions, Journal ni Ordonnances. `/garanties` revient au tableau.

## Ensuite

Rien.
