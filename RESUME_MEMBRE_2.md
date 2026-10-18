# PrediCare — ce qui est terminé côté plateforme

Résumé pour l'équipe, octobre 2026. Il couvre la part backend, base et exploitation. L'entraînement du modèle reste au membre 1. Les écrans, le guide utilisateur et l'assistant documentaire restent au membre 3 : les routes qu'ils consomment sont prêtes.

La pile se lance avec `docker compose up`. Elle contient PostgreSQL (pgvector), l'API FastAPI et n8n. Il n'y a pas encore d'interface web.

## État actuel

- Version de modèle active : `v2` (pipeline XGBoost, 23 variables). Le retour à `v1` se fait sans redémarrer l'API. Il n'y a pas de score simulé.
- Seuil d'alerte : lu dans `app.settings` (valeur d'exemple du cahier des charges : 0,8). Ce n'est pas le seuil de rappel de la fiche du membre 1 (environ 0,73).
- Cohorte chargée : 84 593 factures dans `clean`, identités chiffrées (4 459 charges). Les labels ne sont pas lus par l'API.
- Tests : 93 passent, 1 est ignoré (le score réel v2 se calcule dans le conteneur Python 3.12, pas sur le Python 3.14 de l'hôte).
- Répétition de la chaîne exécutée deux fois, avec un redémarrage entre les deux. Les deux se terminent sans échec.

`GET /health` répond. Son champ `model_version` vaut `v2`. La version vraiment active est dans `GET /admin/settings`.

## Ce qui a été livré

1. **Socle.** Docker Compose, migrations Alembic, chargement des CSV, `GET /health`, CI (tests, lint, build, scan des dépendances, démarrage de la base).

2. **Données servies.** Schéma `clean` reconstruit depuis `raw` à chaque migration, sans labels ni identités. Une facture invalide est rejetée avec un code et un motif (`422`), jamais par une erreur 500.

3. **Pseudonymisation.** L'assuré dans `clean` est un HMAC. Le coffre `identites.coffre` est chiffré. L'année de naissance est remplacée par une tranche d'âge. Ré-identification et effacement passent par une clef admin et laissent un audit sans le nom. Pièces dans `docs/02-conformite/`.

4. **Modèle du membre 1.** Registre des fiches `v1` et `v2`, 23 variables. Le score attend `models/<version>/model.joblib`. Le score, la version et les contributions SHAP sont stockés. Un changement de version ne coupe pas l'API. Si la version ne peut pas scorer, la facture n'est pas enregistrée (`503`, `MODELE_INDISPONIBLE`).

5. **Parcours API, quatre rôles.** Connexion par jeton. Prestataire : déposer une facture ou un lot. Assuré : lire ses remboursements. Gestionnaire : file d'alertes, rapport SHAP, décision (`valider`, `rejeter`, `complement`). Administrateur : seuil, canaux, version du modèle. Un mauvais rôle reçoit `403`. Contrat : `docs/05-api/`.

6. **Alerte n8n.** Au-dessus du seuil, le workflow `n8n/workflows/alerte.json` envoie le score, les contributions et un lien (identifiant de facture et pseudonyme). Le canal `webhook` journalise l'envoi dans `app.alertes`. Trois tentatives, puis une ligne `echec`. Le message ne contient ni nom ni CIN.

7. **Tableau de bord, côté données.** Schéma `bi` en lecture seule (volumes, alertes par statut, décisions humaines, distribution des scores), plus `GET /bi`. Pas de labels, pas d'identité. Compte `prediccare_bi`.

8. **Exploitation.** Sauvegarde et restauration démontrées. Redémarrage sans perte des données. Supervision (volume, latence, erreurs) et dérive des scores. Guides : `docs/06-exploitation/` (guide, runbook, supervision). La dérive reste `reference_absente` tant que le membre 1 n'a pas déposé `distribution_reference` dans la fiche v2.

9. **Sécurité.** Grille dans `docs/07-securite/mecanismes.md` : chaque contrôle cite un fichier (mots de passe hachés, jeton 8 heures, secrets hors du dépôt, droits minimaux, coffre, audits, validation, scan des dépendances). Limite de débit sur le login et la clef admin. La signature du membre 1 sur la partie modèle de cette grille n'est pas encore apposée.

10. **Répétition.** `ops/repetition.py`, décrit dans `docs/06-exploitation/repetition.md`. Deux passages : 20 factures (6 invalides rejetées, 14 scorées), puis une facture suivie jusqu'à la notification et la décision du gestionnaire, plus un aller-retour de modèle. Le second passage retrouve les données du premier après redémarrage.

## Ce que les autres peuvent brancher

| Besoin | Où |
|---|---|
| Déposer, scorer, expliquer, décider | routes de `docs/05-api/matrice-roles.md` |
| Chiffres du tableau de bord | `GET /bi` ou le schéma `bi` |
| Alerte | workflow déjà importé dans n8n |
| Agent documentaire, lecture d'un seul assuré | compte `prediccare_agent`, limité au pseudonyme de session |
| Seuils sans redéploiement | `PATCH /admin/settings` |

## Pas encore fait, et par qui

- **Écrans, guide utilisateur, tableau de bord visuel** : membre 3. Aucune page web dans le dépôt. Les routes sont prêtes.
- **Assistant documentaire (RAG, PDF)** : membre 3. Pas de code sous `rag/`, pas de fiche de menaces. Le compte en lecture seule et la règle « l'identifiant d'assuré vient de la session » sont en place.
- **Distribution de référence pour la dérive** : membre 1, clé `distribution_reference` dans `models/v2/metadata.json`.
- **Signature** de la partie modèle dans `docs/07-securite/mecanismes.md` : membre 1.
- **Image Docker** : les pins `cryptography` 50.0.0, `fastapi` 0.143.1 et `starlette` 1.8.0 sont dans le dépôt et le scan est propre. L'image qui tourne a été construite avant ce changement. Le prochain `docker compose build` l'aligne.
- **Répétition sur un volume vide** : non rejouée ici, pour ne pas effacer la cohorte déjà chargée. La commande est dans le guide de répétition.

Le compte assuré ne voit des remboursements que si `AUTH_ASSURE_ID` contient un pseudonyme de `clean.assures`. Tant que cette variable est vide, sa liste est vide.
