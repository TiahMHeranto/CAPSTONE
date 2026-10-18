# 44 — Essai sur une facture d'exemple

## Ce qui a été constaté

`FAC-00005637.pdf` et `FAC-00006241.pdf` arrivent au webhook. Le premier essai renvoyait le type, les dates et le total, mais pas l'identifiant ni les lignes. Le numéro imprimé contient des barres (`BA177/2026/00043`), refusées par le contrat d'identifiant. Les actes sont un tableau (code, libellé, quantité, prix), pas une ligne `code | ACTE | ...`. L'exécution n8n n'est pas conservée, donc l'éditeur ne montre pas le PDF.

## Correction

Le nœud Parser lit ce tableau et les étiquettes de la facture d'exemple : date des soins, date de facture, type, assuré, ordonnance, total. Les `/` du numéro deviennent des `-`. Le libellé du document prime sur une valeur devinée par le modèle.

## Vérification

- `FAC-00005637.pdf` : complet, `BA177-2026-00043`, laboratoire, 23 000, `ORD-0003289`, lignes `LAB-NFS` et `LAB-CRP`.
- `FAC-00006241.pdf` : complet, `PLM057-2025-00031`, pharmacie, 12 100, deux médicaments.
