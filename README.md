# PrediCare TPA

Plateforme de contrôle des factures de tiers payant. Ce dépôt démarre la pile avec une commande. Le modèle réel, l'interface et l'assistant documentaire viendront dans les étapes suivantes. Un modèle simulé occupe déjà la fonction de prédiction.

## Démarrage

```bash
cp .env.example .env
docker compose up --build
```

Puis ouvrir `http://localhost:8000/health`. La réponse attendue contient `"status": "ok"` et `"model_version": "mock-0.1"`.

n8n écoute sur `http://localhost:5678`. Le workflow d'alerte s'importe selon `docs/04-workflow/fiche-alerte.md`.

## Ce que la pile contient

- PostgreSQL avec pgvector
- migrations Alembic (schémas `raw`, `identites`, `labels`, `clean`, `app`)
- chargement des CSV au premier passage du service `migrate`
- coffre d'identités chiffré et pseudonyme HMAC dans `clean`
- API FastAPI, rôle `prediccare_app`
- seuil d'alerte dans `app.settings`, initialisé depuis `ALERT_THRESHOLD`
- n8n

Les pièces de conformité sont dans `docs/02-conformite/` et la matrice des rôles dans `docs/05-api/matrice-roles.md`.

L'exploitation (sauvegarde, restauration, supervision, retour arrière) est dans `docs/06-exploitation/`. Les scripts `db/backup/backup.sh` et `db/backup/restore.sh` s'exécutent dans le conteneur base :

```bash
docker compose exec db sh /backup/backup.sh
docker compose exec db sh /backup/restore.sh
```

## Tests

```bash
pip install -r backend/requirements-dev.txt
pytest
pip-audit -r backend/requirements.txt
```

## Validation d'une facture

`POST /invoices/validate` réutilise les règles du passage `raw` → `clean`. Une facture invalide reçoit `422` avec un code et un motif. Le schéma `clean` est reconstruit à chaque démarrage du service `migrate`, sans lire les labels. Les assurés y portent un pseudonyme, pas leur identité.

`POST /auth/login` délivre un jeton pour les quatre rôles. `POST /invoices` score une facture valide avec la version active (`mock-0.1` par défaut) et le seuil lu dans `app.settings`. Une facture invalide est rejetée avec un code et un motif, et une ligne d'audit. Le contrat est dans `docs/05-api/contrat-donnees.md`.

`POST /admin/reidentify` et `POST /admin/erase` exigent l'en-tête `X-Admin-Key`. Ils écrivent l'audit sans y copier le nom. `PATCH /admin/settings` accepte aussi le jeton administrateur : seuil, canaux, URL n8n, version active. Le changement est lu à la facture suivante, sans redémarrage, et une ligne d'audit garde l'ancienne valeur, la nouvelle, l'auteur et l'heure.

## Tableau de bord

`GET /bi` sert au gestionnaire et à l'administrateur les volumes, les alertes par statut, les décisions humaines et la distribution des scores. Les mêmes chiffres sont dans le schéma `bi`, en lecture seule pour le compte `prediccare_bi`. Ce schéma porte des agrégats et des décisions, sans labels ni identités. Le détail est dans `docs/05-api/contrat-donnees.md`.

## Registre des modèles

Le membre 1 a entraîné trois versions. Le pipeline retenu est `models/v2/model.joblib` : 29 variables, XGBoost. `baseline` et `v1` restent des fiches sans poids. Tant que la version active est `mock-0.1`, l'API score avec le mock. Passer `active_model_version` à `v2` charge le pipeline, et le retour au mock se fait dans le même processus. Le seuil d'alerte reste celui de `app.settings`, distinct du seuil de rappel enregistré sur la fiche.

## Alerte

Quand le score atteint le seuil, l'API appelle le workflow `n8n/workflows/alerte.json`. Le workflow relit le seuil et les canaux, puis journalise l'envoi. L'import est décrit dans `docs/04-workflow/fiche-alerte.md`.

## Sécurité et répétition

La grille des contrôles et les fichiers qui les prouvent sont dans `docs/07-securite/mecanismes.md`. La répétition de bout en bout est `ops/repetition.py`, décrite dans `docs/06-exploitation/repetition.md`.

## Suite

La part plateforme du membre 2 s'arrête ici. Le dossier, les slides et le guide utilisateur restent collectifs. Le détail est dans `PLAN_MEMBRE_2.md`.
