# PrediCare TPA

Plateforme de contrôle des factures de tiers payant, utilisable par un professionnel de santé, un assuré, un gestionnaire et un administrateur. Ce dépôt démarre toute la pile avec une commande. Le score vient d'un pipeline XGBoost à 23 variables. La version active se lit dans `app.settings`. Sans le fichier de poids de cette version, le dépôt refuse la facture.

## Démarrage

```bash
cp .env.example .env
docker compose up --build
```

Puis ouvrir `http://localhost:3000`. La santé de l'API est `http://localhost:8000/health` : `"status": "ok"` et `"model_version": "v2"`.

Les comptes créés au premier passage sont `prestataire`, `assure`, `gestionnaire` et `administrateur`. Le mot de passe est `AUTH_DEMO_PASSWORD`. Chaque rôle arrive sur un tableau de bord : profil, contrat et formule quand le compte est rattaché, volumes de factures et d'ordonnances, et, pour le gestionnaire et l'administrateur, alertes, décisions et taux de détection.

n8n écoute sur `http://localhost:5678`. Superset écoute sur `http://localhost:8088` et lit le schéma `bi`.

## Ce que la pile contient

- PostgreSQL avec pgvector
- migrations Alembic (schémas `raw`, `identites`, `labels`, `clean`, `app`, `bi`)
- chargement des CSV au premier passage du service `migrate`
- coffre d'identités chiffré et pseudonyme HMAC dans `clean`
- API FastAPI, rôle `prediccare_app`
- interface Next.js
- seuil d'alerte dans `app.settings`, initialisé depuis `ALERT_THRESHOLD`
- n8n, pour l'alerte et la lecture d'un PDF
- Gemma 4, via l'API Google AI Studio (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`)
- Superset, sur les vues du schéma `bi`

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

## Facture

Deux entrées mènent au même dépôt.

- Saisie manuelle dans l'écran Factures.
- PDF : `POST /invoices/extract` envoie le fichier au workflow `n8n/workflows/ocr.json`, qui lit le texte puis interroge le modèle (`LLM_MODEL`). Les champs reviennent dans le formulaire. Rien n'est scoré tant que l'utilisateur ne dépose pas. La lecture ne conserve ni nom, ni adresse, ni téléphone, ni e-mail, ni CIN.

`POST /invoices/validate` réutilise les règles du passage `raw` → `clean`. Une facture invalide reçoit `422` avec un code et un motif, jamais une erreur 500. `POST /invoices` score une facture valide avec la version active et le seuil lu dans `app.settings`. Le résultat affiche le score, la classe et les contributions qui l'expliquent. Une facture invalide est rejetée avec un code et un motif, et une ligne d'audit. Le contrat est dans `docs/05-api/contrat-donnees.md`.

Un identifiant imprimé `ASS-…` est traduit en pseudonyme avant la recherche. Un identifiant inconnu reste `REFERENCE_INCONNUE`.

## Comptes et réglages

`POST /auth/login` délivre un jeton pour les quatre rôles. Le jeton de session est un cookie httpOnly. Le gestionnaire et l'administrateur sont déconnectés après 15 minutes sans activité.

`POST /admin/reidentify` et `POST /admin/erase` exigent l'en-tête `X-Admin-Key`. Ils écrivent l'audit sans y copier le nom. `PATCH /admin/settings` accepte aussi le jeton administrateur : seuil, canaux, URL n8n, version active. Le changement est lu à la facture suivante, sans redémarrage, et une ligne d'audit garde l'ancienne valeur, la nouvelle, l'auteur et l'heure. L'écran Modèles bascule entre `v1` et `v2` de la même façon.

## Tableau de bord

`GET /bi` sert au gestionnaire et à l'administrateur les volumes, les montants économisés, le taux de détection, les alertes par statut, les décisions humaines et la distribution des scores. Les mêmes chiffres sont dans le schéma `bi`, en lecture seule pour le compte `prediccare_bi`. Ce schéma porte des agrégats et des décisions, sans labels ni identités. L'écran Pilotage les affiche. Le détail est dans `docs/05-api/contrat-donnees.md`.

## Registre des modèles

`v1` et `v2` sont livrés : `models/v1/model.joblib` et `models/v2/model.joblib`. Chaque pipeline a 23 variables, dans l'ordre de sa fiche, et a été enregistré avec scikit-learn 1.9.1. Il n'y a pas de score simulé. La version active au démarrage est `v2`. Un fichier dont les colonnes diffèrent de la fiche est refusé : le dépôt répond `503` `MODELE_INDISPONIBLE` et la facture n'est pas enregistrée. Le seuil d'alerte reste celui de `app.settings`, distinct du seuil de rappel enregistré sur la fiche.

## Alerte et lecture PDF

Quand le score atteint le seuil, l'API appelle le workflow `n8n/workflows/alerte.json`. Le workflow relit le seuil et les canaux, puis journalise l'envoi. L'import est décrit dans `docs/04-workflow/fiche-alerte.md`.

La lecture d'un PDF est décrite dans `docs/04-workflow/fiche-ocr.md`. Ollama doit tourner sur la machine hôte pour qu'une facture sans texte déjà extrait soit complétée.

## Assistant

`POST /assistant` répond à une question sur les remboursements et les garanties, avec les sources du corpus. La réponse affichée ne montre pas la requête SQL.

## Sécurité et répétition

La grille des contrôles et les fichiers qui les prouvent sont dans `docs/07-securite/mecanismes.md`. La répétition de bout en bout est `ops/repetition.py`, décrite dans `docs/06-exploitation/repetition.md`.

## Suite

L'interface couvre les quatre parcours. Le guide utilisateur, les slides et le dossier restent collectifs. Le détail de la part plateforme est dans `PLAN_MEMBRE_2.md`.
