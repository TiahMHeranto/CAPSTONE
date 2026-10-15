# 19 — Ordonnances au dépôt et pilotage

## Fait

Le dépôt accepte `ordonnance_id`. Le score charge l'ordonnance et ses lignes. Les anomalies (doublon, péremption, quantité, ligne absente, autre assuré, spécialité hors diagnostic) sont enregistrées et lisibles par le gestionnaire sur `GET /alerts/prescriptions`.

La synthèse ajoute `montant_economise` et `taux_detection`.

Le diagnostic d'un assuré reste dans `raw`. Une fonction ne renvoie qu'un booléen.

## Pourquoi

Le cahier demande le contrôle des prescriptions et les deux indicateurs de pilotage.

## Fichiers

`migrations/sql/008_pilotage.sql`, `migrations/versions/008_pilotage.py`, `backend/app/services/prescriptions.py`, `flux.py`, `bi.py`, écran factures, alertes et synthèse.

## Vérification

61 tests passent, 1 ignoré. Sur la base en cours : 82175 lignes d'ordonnance, taux de détection 0,1351, montant des rejets confirmés 0 (aucune décision « rejeter »). L'API gestionnaire renvoie ces champs.

## Ensuite

L'assistant reste à faire : pas de corpus de contrats dans la pile.
