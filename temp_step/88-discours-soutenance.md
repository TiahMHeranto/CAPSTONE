# 88 — Discours de soutenance

## Ce qui a été fait

Rédaction d'un discours complet de présentation orale pour PrediCare TPA, calé diapositive par diapositive sur `Sujet et repartition/PrediCare TPA.pptx` (18 diapositives). Le texte reprend les chiffres exacts du support (84 593 factures, 8,69 % de fraude, 23 indicateurs, seuil 0,543, 94,7 % / 87,4 %, les trois réglages v1/v2/v3, les montants en ariary) et les complète avec des éléments factuels tirés de `README.md` (seuil configurable sans redémarrage, retour arrière de version de modèle, refus `503 MODELE_INDISPONIBLE`, sauvegarde/restauration) pour anticiper les questions du jury.

## Pourquoi

L'équipe a demandé un script de parole pour la soutenance, basé sur le support PowerPoint déjà prêt et sur l'état réel du projet, afin de pouvoir répéter l'oral sans improviser les chiffres ni les garanties techniques (seuil non figé, refus propre des factures invalides, etc.) exigées par le CDC.

## Fichiers touchés

- `docs/livrables/08-discours-soutenance.md` (nouveau) : le discours, avec répliques suggérées par membre, un bloc dédié à la démo (diapositive 16), et une section « notes de passation » pour les questions probables du jury.

## Comment vérifier

Ouvrir `docs/livrables/08-discours-soutenance.md` et le comparer diapositive par diapositive à `Sujet et repartition/PrediCare TPA.pptx`. Remplacer les placeholders `[Membre 1]`, `[Membre 2]`, `[Membre 3]` et leurs rôles par les vrais noms avant l'oral.

## Ce qui reste

- Ajouter les vrais noms et rôles des trois membres.
- Répéter le discours en conditions réelles pour ajuster le minutage (visé : 12–15 min hors démo).
- Si le PDF des livrables (`docs/livrables/*.pdf`) est régénéré via `docs/livrables/vers_pdf.py`, penser à inclure ce nouveau fichier dans la génération si on veut une version PDF du discours.
