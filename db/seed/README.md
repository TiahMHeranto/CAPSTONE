# Chargement initial

Le chargement des CSV au premier démarrage est fait par `python -m app.db.bootstrap` (service `migrate`).

- Les 11 tables métier vont dans le schéma `raw` (texte brut, non modifié).
- `identites_pii.csv` va dans le schéma `identites`, non accordé au rôle de l'API.
- Les labels vont dans le schéma `labels`, non accordé au rôle de l'API.

Ce dossier ne contient pas les CSV. Ils restent dans `CohorteAI_datagen/`.
