# 41 — Modèle M1 v2, sans score simulé

## Ce qui a été fait

Le clone `M1_files/predicare-tpa` (commit `update V2`) remplace les fiches du projet. `v1` et `v2` décrivent le même pipeline XGBoost à 23 variables. Les seuils de rappel des fiches diffèrent (`v2` environ 0,543, `v1` environ 0,716). Le score d'alerte de la plateforme reste celui de `app.settings`, pas celui de la fiche.

Le dossier `models/baseline` et l'ancien `models/v2/model.joblib` (29 variables, incompatible) ont été retirés. Les fiches copiées sont `metadata.json` et `schema_inference.json` pour `v1` et `v2`. Le clone ignore `model.joblib` : aucun poids n'a été livré. On n'invente pas de fichier de poids.

Le score simulé `mock-0.1` n'est plus appelé. `predict` charge toujours la fiche et le joblib. Fichier absent ou variables manquantes : `503` `MODELE_INDISPONIBLE`, facture non enregistrée. La version active au premier chargement d'une base vide est `v2`. `/health` annonce `v2`.

Les 23 variables suivent le notebook d'exploration du membre 1 (ordonnances, ratios grille et référentiel, fenêtres de 7 jours, délai, majoration, upcoding, jour de fermeture). La migration `016` ajoute sur `clean` les colonnes que l'API ne pouvait pas lire dans `raw` : `date_fin_convention`, `jours_ouverture`, `tarif_reference`, `tarif_max`. Le script de reconstruction les remplit aussi.

## Pourquoi

La fiche nouvelle ne correspond plus à l'ancien joblib ni au mock. Garder le mock aurait continué à scorer sans le modèle du membre 1.

## Fichiers

- `models/v1/`, `models/v2/` (fiches seulement)
- `backend/app/services/features.py`, `inference.py`, `registry.py`, `flux.py`, `derive.py`
- `backend/app/db/bootstrap.py`, `backend/app/cleaning/rebuild.py`
- `migrations/sql/016_features_v2.sql`, `migrations/versions/016_features_v2.py`
- tests `test_inference`, `test_registry`, `test_health`, `test_flux`
- README, guide d'exploitation, contrat, OpenAPI, répétition, plans

## Vérification

`ruff check` passe. `pytest backend/tests` : 136 tests.

Docker n'était pas démarré : la migration `016` n'est pas appliquée sur la base en cours, et `app.settings.active_model_version` peut encore valoir `mock-0.1`. Au prochain `docker compose up` :

```text
docker compose cp migrations/sql/016_features_v2.sql db:/tmp/016_features_v2.sql
docker compose exec -T db psql -U prediccare -d prediccare -v ON_ERROR_STOP=1 -f /tmp/016_features_v2.sql
```

Puis `UPDATE app.settings SET value = 'v2' WHERE key = 'active_model_version';`

Sans `models/v2/model.joblib` fourni par le membre 1, un dépôt reste en `503`. Le retour arrière prévu est `v1`, dès que son joblib est au même endroit.

## Ensuite

Placer les poids `model.joblib` de `v2` (et de `v1` pour le retour arrière), appliquer `016`, puis déposer une facture et contrôler score, version et contributions.
