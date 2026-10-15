# Mécanismes de sécurité

Chaque ligne de la grille pointe vers un fichier du dépôt. La partie modèle est à co-signer par le membre 1 : il entraîne, le membre 2 sert l'artefact et refuse les colonnes interdites. La partie plateforme est tenue par le membre 2.

| Exigence | Preuve |
|---|---|
| Mots de passe hachés (PBKDF2-SHA256, 200 000 tours) | `backend/app/core/tokens.py`, comptes créés dans `backend/app/db/bootstrap.py` |
| Jeton à durée limitée (8 heures), signature HMAC | `backend/app/core/tokens.py`, test `test_jeton_aller_retour` |
| Secrets hors du dépôt | `.gitignore` (`.env`), valeurs d'exemple dans `.env.example` |
| Limite de débit sur le login et les routes admin | `backend/app/core/limite.py`, variables `RATE_LIMIT_LOGIN` et `RATE_LIMIT_ADMIN` |
| Validation stricte des factures, rejet sans erreur 500 | `backend/app/cleaning/validate.py`, `backend/app/schemas/facture.py` |
| Identifiant de facture refusé s'il contient une injection | motif `facture_id` dans le test `test_facture_id_injecte_est_refuse` |
| Dépendances scannées en CI | `.github/workflows/ci.yml` (`pip-audit`), pins dans `backend/requirements.txt` |
| L'API n'est pas superutilisateur | `DATABASE_URL` et les `GRANT` de `backend/app/db/bootstrap.py` |
| L'agent du membre 3 est en lecture seule, limité à l'assuré de la session | politiques `agent_assure` dans `backend/app/db/bootstrap.py` |
| Lecture BI sans labels ni identités | `migrations/sql/007_bi.sql`, compte `prediccare_bi` |
| Coffret d'identités chiffré, pas de lecture directe par l'API | `backend/app/privacy/crypto.py`, fonction `identites.lire_charge` |
| Audit de ré-identification et d'effacement, sans le nom | `backend/app/privacy/admin.py` |
| Audit du changement de seuil (avant, après, auteur, heure) | `backend/app/services/reglages.py` |
| Audit de la décision du gestionnaire, sans le motif libre | `backend/app/services/flux.py` |
| Requêtes de l'API paramétrées | arguments `%s` de psycopg dans `backend/app` |
| Sauvegarde et restauration | `db/backup/backup.sh`, `db/backup/restore.sh` |
| Le score n'utilise pas les labels ni les colonnes de décision | `COLONNES_INTERDITES` dans `backend/app/services/registry.py` |
| Alerte sans nom ni CIN | `n8n/workflows/alerte.json`, `docs/04-workflow/fiche-alerte.md` |

Les seuils d'alerte et de dérive se lisent dans `app.settings`. Ils ne sont pas écrits en dur dans le calcul du score.

## Partie modèle, à co-signer

Le membre 1 fournit `models/v2/model.joblib` et sa fiche. Le membre 2 vérifie au chargement que les colonnes ne contiennent ni `est_fraude`, ni les champs d'identité, ni les colonnes de décision. Le seuil de rappel de la fiche n'est pas le seuil d'alerte de la plateforme.

Signature membre 1 (modèle) :

Signature membre 2 (plateforme) :

## Revue du modèle de menaces RAG

Le membre 3 n'a pas encore déposé de fiche de menaces dans le dépôt. Il n'y a pas de code sous `rag/`. La règle attendue est dans `.cursor/rules/rag-agent.mdc` : pas de SQL libre, identifiant d'assuré pris dans la session, compte en lecture seule.

Côté membre 2, ces trois points sont déjà vrais :

- `prediccare_agent` n'a que `SELECT` sur `clean.assures`, `clean.factures`, `clean.lignes_facture` et `clean.ordonnances`.
- Chaque politique exige `prediccare.assure_id`, posé par la session, pas par le texte de la question.
- Les lectures d'identité passent par `identites.lire_charge(%s)` et `identites.effacer_charge(%s)`.

`backend/app/db/seed.py` construit un `COUNT(*)` avec le nom de table du catalogue, pendant le chargement, pas depuis une requête HTTP.

Quand la fiche du membre 3 arrivera, la relecture vérifiera les mêmes trois points dans son code d'agent.
