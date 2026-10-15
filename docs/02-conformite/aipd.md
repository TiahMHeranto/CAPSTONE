# Analyse d'impact (AIPD)

Le traitement vise des données de santé et un score qui peut conduire à un contrôle de facture. Même sur un jeu synthétique, l'analyse décrit le système tel qu'il serait exploité.

## Risques

- Ré-identification d'un assuré à partir du nom, du téléphone, de l'e-mail ou du CIN.
- Usage du score comme décision automatique, sans relecture humaine.
- Accès de l'agent documentaire à l'historique d'un autre assuré.
- Fuite d'un identifiant dans un journal, un prompt ou une explication SHAP.

## Mesures en place

- Les identités directes sont dans `identites.coffre`, chiffrées. Le schéma `clean` porte le pseudonyme HMAC et une tranche d'âge, pas l'année de naissance ni la date de naissance.
- Le rôle de l'API ne lit pas la table du coffre. Il appelle deux fonctions : lire une charge, ou l'effacer.
- La ré-identification et l'effacement exigent `X-Admin-Key`. Chaque appel écrit `app.audit_log` avec le pseudonyme et le résultat, sans le nom ni les coordonnées.
- L'agent n'a pas le schéma `identites`, ni `raw`, ni `labels`. Ses lectures sur l'historique sont limitées à l'assuré dont le pseudonyme est posé dans `prediccare.assure_id`.
- Le chargement échoue si un scan trouve un e-mail, un téléphone, un CIN, un nom complet ou l'identifiant source dans `clean`.

## Risque résiduel

Le schéma `raw` conserve la copie intégrale des CSV, y compris `souscripteur_nom`. Ce schéma n'est pas servi à l'API ni à l'agent. Le compromettre suppose le compte propriétaire de la base.

La ville et le sexe restent dans `clean`. Ce sont des quasi-identifiants. Une combinaison rare d'actes peut encore réduire le groupe. Le membre 1 dira si la ville doit être généralisée avant l'entraînement.

## Décision humaine

Un score ne rejette pas une facture. Le gestionnaire valide, rejette ou demande un complément. Cette décision sera la route de la phase 6.
