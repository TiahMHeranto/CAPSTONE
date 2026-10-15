# 05 — Phase 4, livrée par le membre 1

## Fait par le membre 1

Entraînement du score de fraude, cible `est_fraude`. Le membre 2 n'a pas réentraîné.

- Une seule construction de variables, `build_features`, relit les CSV bruts et ne lit pas `identites_pii.csv`.
- Hors du modèle : la décision de gestion (`statut`, `motif_rejet`, `montant_pris_en_charge`, `reste_a_charge`, `date_traitement`), les labels, le diagnostic, l'identité, et les attributs protégés `sexe` et `age_soin` (gardés pour l'équité).
- Découpage temporel : entraînement avant le 2026-01-01 (51 387), validation jusqu'au 2026-05-01 (16 029), test ensuite (17 177). Le seuil de rappel est choisi sur la validation.
- Trois fiches dans `M1_files/predicare-tpa/models/` :

| Version | Algorithme | Seuil métier | Rappel test | Précision test | PR-AUC test |
|---|---|---|---|---|---|
| baseline | HistGradientBoosting | 0,667 | 0,963 | 0,971 | 0,992 |
| v1 | XGBoost | 0,711 | 0,960 | 0,976 | 0,992 |
| v2 | XGBoost | 0,729 | 0,949 | 0,972 | 0,990 |

- 63 variables, les mêmes pour les trois versions. v2 est la plus récente (2026-10-14, 11:37). Son rappel est un peu plus bas sur `PRESTATAIRE_RADIE` (0,72) et `HORS_COUVERTURE` (0,74). Des règles dures, dans son code d'inférence, renvoient quand même ces factures au contrôle.
- Le seuil d'alerte du cahier des charges (exemple 0,8, lu dans la configuration) n'est pas le seuil métier ci-dessus. Les deux coexistent.

## Manque dans la livraison

`models/**/model.joblib` est dans le `.gitignore` du membre 1. Les poids ne sont pas dans le clone. Sans eux, on ne peut pas calculer un score réel.

## Ensuite

Préparer le registre côté plateforme, et brancher le score quand le fichier `model.joblib` de v2 arrivera.
