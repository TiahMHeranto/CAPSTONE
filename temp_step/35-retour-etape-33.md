# 35 — Retour à l'état de l'étape 33

## Fait

Le pipeline SQL contrôlé (modèle qui écrit le SQL, SQLGlot qui le valide, rôle `prediccare_agent` qui l'exécute) est entièrement retiré. L'assistant revient au comportement de l'étape 33 : une question de dossier lit une liste fixe de 8 factures (`facture_id, statut, type_facture, montant_total, date_soin, ordonnance_id`) via une requête `UNION` écrite à la main, pas une requête proposée par le modèle.

Un commit de sauvegarde (`e14c223`, « Checkpoint: pipeline SQL controle (etape 34) avant retour a l'etape 33 ») garde tout le travail retiré, récupérable avec `git show e14c223` ou `git cherry-pick`/`git diff e14c223` si une partie doit être reprise plus tard.

## Pourquoi

Le pipeline SQL généré par le modèle a produit une requête d'agrégat (`SUM`/`COUNT`) à la place d'une liste pour « Peux-tu me lister mes factures ? », et la réponse finale a dit ne trouver aucune information alors que des factures existaient. La cause : la sélection des exemples question→SQL se fait par intersection de mots sans gérer pluriels ni conjugaisons, et le prompt de synthèse ne sait pas parler d'un résultat agrégé. Plutôt que de corriger ce pipeline risqué juste après l'avoir construit, on revient à la base stable de l'étape 33 pour recommencer les réponses SQL avec une autre approche.

Entre l'étape 33 et ce pipeline, une version intermédiaire avait existé dans la conversation (jointure facture + lignes + établissement en SQL fixe, sans modèle). Elle n'a pas survécu : écrasée par les mêmes fichiers avant d'être committée nulle part, donc non récupérable depuis `git`. Seule la base de l'étape 33 est un point de départ garanti.

## Fichiers

`backend/app/services/assistant.py`, `backend/app/rag/route.py` (déjà identique à l'étape 33, aucune modification), `backend/app/db/bootstrap.py`, `backend/app/db/session.py`, `backend/app/config.py`, `backend/requirements.txt`, `backend/tests/test_assistant.py`, `docker-compose.yml`, `docs/05-api/matrice-roles.md`, `docs/07-securite/mecanismes.md`, `frontend/app/(espace)/assistant/page.tsx`.

Supprimés : `backend/app/rag/sql_guard.py`, `schema_dossier.json`, `exemples_sql.json`, `backend/tests/test_sql_guard.py`, `migrations/sql/014_agent_dossier.sql`, `migrations/versions/014_agent_dossier.py`.

Base en cours : les vues `clean.dossier_*` sont supprimées, les droits de `prediccare_agent` sur `app.factures`/`app.lignes_facture` et les référentiels sont révoqués, le `statement_timeout` du rôle est réinitialisé, et les politiques `agent_assure` sur `clean.factures`/`clean.ordonnances`/`clean.lignes_facture` sont recréées avec le filtre simple `assure_id` d'origine (sans la variante prestataire ajoutée en 34).

## Vérification

`pytest tests/test_assistant.py` : 12 tests passés, comme à la fin de l'étape 33. En base : `prediccare_agent` n'a plus de `statement_timeout`, n'a plus accès au schéma `app`, `clean.dossier_factures` n'existe plus, et `clean.factures` porte à nouveau exactement 2 politiques (`app_lecture`, `agent_assure` avec le filtre `assure_id` seul). Cache assistant vidé.

## Ensuite

Reconstruire l'image `api` (elle contient encore `sqlglot` et le code de l'étape 34 dans l'image buildée précédemment, dont la construction avait de toute façon échoué). Repartir des réponses SQL dossier avec une méthode plus sûre que « le modèle écrit le SQL librement » : par exemple des gabarits de requête fixes choisis par mots-clés (comme `intention`), ou une sélection d'exemples par similarité d'embedding plutôt que par mots en commun, avec un prompt de synthèse qui sait résumer un total/compte en plus d'une liste.
