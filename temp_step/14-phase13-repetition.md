# 14 — Phase 13, répétition technique

## Fait

`ops/repetition.py` a été exécuté deux fois sur la pile en cours, avec un redémarrage de la base, de l'API et de n8n entre les deux. Les deux passages se terminent par `echecs 0`.

Chaque passage : santé, refus des quatre rôles, vingt factures (six rejetées avec un motif, quatorze scorées, explications présentes), une facture de chaîne au seuil abaissé (alerte, notification enregistrée, décision `COMPLEMENT`), retour du seuil, passage par `mock-0.1` puis retour à la version active, santé toujours à 200. Le second passage relit la facture de chaîne du premier après le redémarrage.

La version active finale est `v2`. Le seuil d'alerte est revenu à sa valeur d'avant, 0,8.

La commande `docker compose up` sur un volume vide n'a pas été relancée : elle rechargerait la cohorte et le volume actuel contient déjà les données. La procédure est écrite dans `docs/06-exploitation/repetition.md`.

## Pourquoi

La répétition montre que la chaîne facture, score, explication, stockage, notification et décision tient, y compris après un redémarrage et un aller-retour de modèle.

## Fichiers

- `ops/repetition.py`
- `docs/06-exploitation/repetition.md`

## Vérification

Deux exécutions dans le conteneur API, `REPETITION_ID` 1 puis 2. Sortie : chaque contrôle `OK`, `echecs 0`. Lecture finale des réglages : version `v2`, seuil `0.8`.
