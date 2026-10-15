# 13 — Phase 11, preuves de sécurité

## Fait

Les contrôles déjà en place (mots de passe hachés, jeton à durée limitée, secrets hors du dépôt, droits de la base, coffre chiffré, audits, validation) sont rassemblés dans une grille. Chaque ligne cite un fichier.

Ajout de cette étape : une limite de débit sur `POST /auth/login` et sur les routes `POST /admin/reidentify` et `POST /admin/erase`. Le quota se règle par `RATE_LIMIT_LOGIN`, `RATE_LIMIT_ADMIN` et `RATE_LIMIT_WINDOW_S`. Zéro désactive la limite. Au-delà, la réponse est `429` et `TROP_DE_REQUETES`, sans interroger la base.

La revue RAG constate que le membre 3 n'a pas encore déposé de fiche ni de code sous `rag/`. Le compte `prediccare_agent`, les politiques de ligne et les requêtes paramétrées sont déjà ceux que cette fiche devra utiliser.

## Pourquoi

La grille EU AI Act, tenue par le membre 1, doit pouvoir citer un fichier pour chaque contrôle technique. La limite de débit manquait encore sur le login et la clef admin.

## Fichiers

- `docs/07-securite/mecanismes.md`
- `backend/app/core/limite.py`, `backend/app/api/login.py`, `backend/app/api/admin.py`
- `backend/app/config.py`, `docker-compose.yml`, `.env.example`
- `backend/tests/test_limite.py`

## Vérification

- pytest : 93 tests passent, 1 est ignoré. Le test de débit obtient deux `401` puis un `429`, et la base n'est lue que deux fois.
- Un `facture_id` contenant une apostrophe est refusé par le schéma, avant toute requête.

## Ensuite

Phase 13 : répéter la chaîne deux fois. La signature du membre 1 sur la partie modèle de la grille reste à apposer.
