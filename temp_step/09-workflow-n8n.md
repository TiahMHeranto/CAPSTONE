# 09 — Phase 7, workflow n8n

## Fait

Une facture au-dessus du seuil déclenche le workflow `n8n/workflows/alerte.json`.

- Le webhook reçoit le score, la version, les contributions et le pseudonyme. La clef `X-Alert-Key` écarte un appel anonyme.
- Le workflow relit le seuil et les canaux dans `GET /admin/settings`. Sous le seuil, aucun message ne part.
- Le message contient le score, les contributions et un lien `facture_id` plus pseudonyme.
- Les canaux `slack` et `email` partent vers les URL d'environnement. Le canal `webhook` enregistre l'alerte dans `app.alertes`.
- Trois tentatives, puis une ligne `echec` : c'est la file d'erreurs, lue par `GET /alerts/journal?statut=echec`.

## Pourquoi

La phase 6 savait appeler une URL. La phase 7 transforme cet appel en alerte reçue, et le seuil reste celui de la base.

## Fichiers

`n8n/workflows/alerte.json`, `docs/04-workflow/fiche-alerte.md`, `backend/app/services/alertes.py`, `migrations/versions/006_alertes.py`.

## Vérifié

`pytest` : 49 tests passés, 1 sauté. `ruff` sans erreur.

Le workflow est importé et actif dans le conteneur. `n8n_webhook_url` vaut `http://n8n:5678/webhook/alerte`. La facture `FAC-N0002` a été scorée `alerte` en `mock-0.1` (0,886858, seuil 0,8). `app.alertes` contient une ligne `webhook` / `envoye`, avec le score, la contribution et le lien, sans nom.

## Ensuite

Activer le workflow, poser `n8n_webhook_url` sur `http://n8n:5678/webhook/alerte`, puis déposer une facture dont le score dépasse le seuil. Le modèle v2 reste pour quand l'image Python 3.12 sera reconstruite.
