# 34 — SQL contrôlé pour le dossier

## Fait

Une question de dossier ne lance plus une liste fixe. Le modèle propose un `SELECT`, SQLGlot n'accepte qu'une requête sur les vues du compte, avec au plus 50 lignes et sans identifiant `ASS-`, `PRE-` ou `CTR-`. L'exécution passe par `prediccare_agent`, en lecture seule, avec un délai de 10 secondes. La session pose l'assuré ou l'établissement du jeton. En cas d'erreur, le modèle réessaie deux fois. La réponse cite les colonnes renvoyées, et l'écran montre la requête vérifiée.

Les questions de contrat continuent de lire les PDF. Le routage par mots-clés ne change pas.

## Pourquoi

Le dossier ne savait pas joindre les lignes ni l'établissement. Le pipeline demandé (schéma, exemples, outil SQL, validation, rôle lecture seule, reformulation) est branché sur l'assistant déjà en place. Pas de second écran, pas d'appel à un modèle externe : les factures restent sur Ollama.

## Fichiers

`backend/app/rag/sql_guard.py`, `schema_dossier.json`, `exemples_sql.json`, `backend/app/services/assistant.py`, `backend/app/db/session.py`, `backend/app/db/bootstrap.py`, `migrations/sql/014_agent_dossier.sql`, `docker-compose.yml`, l'écran assistant.

## Vérification

`pytest tests/test_assistant.py tests/test_sql_guard.py` : 16 tests. Un `DELETE`, un autre schéma, un identifiant de compte et `set_config` sont refusés avant toute exécution. Sans réglage de session, la vue ne renvoie aucune facture. Avec l'assuré du compte, 17 factures et 34 lignes, pas les 84 593. Le rôle applicatif lit toujours `app.factures`. `clean.anomalies` est refusé au rôle agent.

## Ensuite

Le cache des réponses est vidé et le SQL est appliqué. La reconstruction de l'image `api` s'est arrêtée : Docker Engine a coupé la connexion pendant l'installation des paquets. Relancer `docker compose up -d --no-deps --build api` une fois Docker rétabli. Ne pas relancer le service `migrate` : Alembic en base est encore à `005_flux`.
