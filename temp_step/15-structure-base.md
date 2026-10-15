# 15 — Fichier de structure de la base

## Fait

Relevé des tables et des vues présentes dans la base `prediccare`, écrit dans `STRUCTURE_BASE.txt`. Aucune ligne de données.

## Pourquoi

Le membre 3 demande le schéma. Le fichier décrit l'état réel, schéma par schéma.

## Vérification

47 relations, 363 colonnes. `app.documents.embedding` est `vector(384)`. La révision Alembic enregistrée est `005_flux` ; `app.alertes` et le schéma `bi` sont déjà là.
