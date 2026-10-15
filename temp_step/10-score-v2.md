# 10 — Modèle v2 branché, retour au mock

## Fait

Le pipeline chargé dans l'image attend 29 colonnes. Il manquait `nb_factures_meme_jour_prestataire` : le nombre de factures du même prestataire le même jour, plus la facture en cours. La fiche `models/v2/metadata.json` et `construire_variables` suivent maintenant l'ordre du pipeline.

`active_model_version` pilote le score. `v2` charge le joblib et stocke le score avec huit contributions. `mock-0.1` reprend dans le même processus. `/health` est resté à 200 pendant les deux dépôts.

## Pourquoi

La phase 7 était sur le mock. L'ordre du plan enchaîne ensuite le modèle du membre 1, sans changer les routes.

## Vérifié

Dans le conteneur, puis par `POST /invoices` :

- `FAC-V2-0001` : version `v2`, score 0,341136, classe `normale`, 8 contributions.
- Retour du réglage à `mock-0.1`, sans redémarrage.
- `FAC-MOCK-0001` : version `mock-0.1`, score simulé, 1 contribution.

Le réglage actif a été remis à `mock-0.1`. Pour scorer avec le pipeline : `PATCH /admin/settings` avec `{"active_model_version": "v2"}`.

`pytest` : 49 passés, 1 sauté (le score v2 sur l'hôte Python 3.14). Le score réel est celui du conteneur Python 3.12.

## Ensuite

Phase 9 : les vues de lecture pour le tableau de bord, le seuil déjà audité, et les refus de rôle déjà en place à compléter si un parcours du membre 3 manque.
