# Plan de charge — Membre 2

Backend, base de données et MLOps. Ce document décrit uniquement le travail du membre 2. Il ne décrit pas l’entraînement du modèle (membre 1) ni le RAG, les écrans et le tableau de bord (membre 3).

Le membre 2 construit le socle, expose les fonctions par API et assemble les blocs. Le score en service est le pipeline `v2` du membre 1. Il n’y a plus de modèle simulé.

Sources de cette répartition : `Repartition_taches_PrediCare_TPA.pdf` et `PrediCare TPA - Plan de réalisation de bout en bout.pdf`.

Contraintes déjà constatées sur le jeu, à respecter dans la base et l’API :

- `identites_pii.csv` porte nom, téléphone, e-mail, adresse et CIN. Ces champs ne sortent pas des tables métier, des logs, des messages n8n, des vecteurs ni des exports SHAP.
- `labels/labels_fraude.csv` est la vérité terrain (`est_fraude`, `type_fraude`). Elle est jointe seulement pour l’entraînement du membre 1. Elle n’est jamais dans les tables servies par l’API.
- `statut = REJETEE` n’est pas une fraude. Environ 5 709 fraudes sont déjà `PAYEE`.
- `est_valide` vaut 1 partout. Ce n’est pas une cible, ni une colonne à exposer comme un contrôle.
- Le score livré s’applique à une facture qui n’a pas encore de `est_fraude`.

---

## Phase 0 — Sa part du cadrage

But : figer, avec le membre 1, ce que l’API reçoit et ce qu’elle renvoie, avant d’écrire les routes.

À faire :

- Inventorier avec l’équipe les fichiers déjà là : 12 CSV de `dataset/`, `labels/`, corpus PDF, exemples de factures et d’ordonnances.
- Participer au périmètre du MVP : une facture entre, un score et une explication SHAP sortent, une alerte part si le score dépasse le seuil.
- Créer dans le dépôt les dossiers dont il a la charge : `migrations/`, `n8n/`, `infra/`, plus l’emplacement de l’API.
- Figer avec le membre 1 le format de réponse du modèle : `facture_id`, score, classe, version du modèle, explications SHAP.
- Figer le schéma minimal des tables (liste en phase 1) et le marquer dans un ADR.
- Trancher avec l’équipe, puis écrire l’ADR : pgvector dans PostgreSQL, outil BI retenu par le membre 3, champs identifiants isolés.

Il attend du membre 1 la liste des variables que le modèle lira, pour ne pas mettre ces colonnes en contradiction avec le schéma.

Sortie : contrats d’API et schéma relus par les trois. Le membre 2 ne code pas les routes tant que ce format n’est pas écrit.

---

## Phase 1 — Fondations techniques

But : une machine propre démarre toute la pile avec une commande, et l’API répond, même sans le vrai modèle.

À faire :

- Écrire `docker-compose.yml` avec PostgreSQL + pgvector, l’API FastAPI, n8n, et un emplacement pour l’interface web et l’outil BI du membre 3.
- Écrire les migrations versionnées (Alembic) pour les tables minimales :
  - référentiels d’actes et de médicaments, prestataires, grille tarifaire
  - contrats, garanties
  - assurés pseudonymisés
  - factures et lignes, ordonnances et lignes
  - prédictions, explications SHAP, décisions des gestionnaires
  - documents vectorisés (pour le membre 3)
  - journal d’audit
  - configuration du seuil et des canaux de notification
- Prévoir le chargement des CSV au premier démarrage, dans un schéma `raw` (le nettoyage vient en phase 2).
- Externaliser la configuration : `.env.example` versionné, `.env` ignoré par Git, secrets hors du code.
- Ajouter `GET /health`, une journalisation structurée, et un modèle simulé derrière la même fonction de prédiction que le vrai modèle utilisera plus tard.
- Mettre en place la CI : lint PEP8, `pytest`, build des images Docker à chaque push.

Documents dont il est l’auteur, relus par le membre 1 :

- README : architecture, démarrage en une commande, structure du dépôt
- schéma de données généré depuis les migrations
- tableau des variables d’environnement : nom, rôle, valeur par défaut, sensibilité

Sortie : `docker compose up` sur une machine propre démarre les services, et `/health` répond.

---

## Phase 2 — Sa part de l’ingestion

But : un script reconstruit les tables propres depuis les CSV bruts, et l’API rejette une facture invalide avec les mêmes règles.

Le membre 1 mène l’exploration et le rapport de qualité. Le membre 2 rend le chargement reproductible et branché sur l’API.

À faire :

- Charger les fichiers bruts dans un schéma `raw` jamais modifié, puis produire un schéma `clean` par des scripts rejouables.
- Appliquer les contrôles déjà listés pour ce jeu : types, doublons de clés, montants, liens entre facture, lignes, ordonnance et référentiels, dates dans l’ordre soin → facture → réception → traitement.
- Tracer chaque anomalie (imputation, rejet, conservation). Ne pas corriger en silence.
- Joindre `labels_fraude.csv` par `facture_id` uniquement dans le jeu d’entraînement du membre 1. Aucune colonne `est_fraude`, `type_fraude` ou `detail_fraude` dans les tables lues par l’API.
- Écrire les règles de validation d’entrée une seule fois, et les réutiliser dans l’API : types, bornes de montants, codes d’actes connus, dates cohérentes.
- Tester le pipeline sur un échantillon dégradé volontairement, préparation du lot de 20 factures inédites du jury.

Il relit la datasheet, le dictionnaire de colonnes et le rapport de qualité écrits par le membre 1.

Sortie : un script unique reconstruit `clean` depuis `raw`, et les tests de validation passent.

---

## Phase 3 — Pseudonymisation et RGPD

But : aucune donnée identifiante n’atteint les tables métier, le modèle, les logs ni les alertes. Le membre 2 pilote cette phase. Le membre 1 relit.

À faire :

- Classer chaque champ : identifiant direct (nom, téléphone, e-mail, adresse, CIN), quasi-identifiant (année de naissance, ville, combinaison rare d’actes), donnée de santé, donnée neutre.
- Isoler `identites_pii.csv` dans une table chiffrée séparée. Le reste de la base ne porte qu’un pseudonyme (`assure_id` déjà pseudonyme dans `assures.csv`, à conserver stable).
- Générer les pseudonymes par HMAC avec une clé secrète stockée hors de la base, stables d’un chargement à l’autre, non réversibles sans la clé.
- Généraliser les quasi-identifiants utiles au modèle avec le membre 1 : tranche d’âge plutôt que date de naissance complète. L’âge se calcule depuis `annee_naissance`, pas depuis le fichier PII.
- Définir qui lit quoi : l’agent du membre 3 ne voit que l’historique de l’assuré connecté ; seul l’administrateur ré-identifie, et chaque ré-identification s’écrit dans le journal d’audit.
- Fixer les durées de conservation et la procédure de suppression.
- Vérifier qu’aucun nom, téléphone, e-mail ou CIN n’apparaît dans les journaux, les prompts, les vecteurs ni les exports SHAP.

Documents dont il est l’auteur, relus par le membre 1 :

- registre des traitements (finalité, base légale, catégories, destinataires, durée)
- AIPD, parce que le traitement vise des données de santé et un score automatisé
- note de pseudonymisation : méthode, gestion des clés, risque résiduel de ré-identification
- procédure des droits : accès, rectification, effacement, intervention humaine

Sortie : un scan automatisé ne trouve aucun nom ni coordonnée hors de la table chiffrée.

---

## Phase 5 — Sa part du versioning

La phase 4 (entraînement, XGBoost ou LightGBM, seuil, matrice de confusion) est au membre 1. Le membre 2 ne l’exécute pas. Il branche le résultat.

À faire :

- Créer les tables `predictions` et `shap_explanations` : score, classe, version du modèle, et 5 à 10 contributions SHAP en langage métier.
- Enregistrer chaque modèle dans un registre versionné : artefact, paramètres, métriques, hachage des données d’entraînement.
- Charger le modèle actif depuis la configuration, pour qu’une bascule ou un retour arrière se fasse sans arrêter l’API.
- Exposer une seule fonction d’inférence, appelée par l’API. Le mock de la phase 1 et le modèle du membre 1 passent par cette même fonction.
- Il relit la model card et la fiche de version écrites par le membre 1.

Il attend du membre 1 : l’artefact, la fonction de prédiction, les valeurs SHAP, le seuil proposé, et la liste des variables autorisées. Cette liste exclut `est_fraude`, `type_fraude`, `detail_fraude`, `est_suspect`, `statut`, `motif_rejet`, `montant_pris_en_charge`, `reste_a_charge` et `date_traitement`.

Sortie : chaque alerte stockée porte une explication et une version, et un retour arrière de modèle est testé sans coupure de l’API.

---

## Phase 6 — API FastAPI

But : le flux facture fonctionne de bout en bout, d’abord avec le mock, puis avec le modèle du membre 1.

Routes :

- soumission d’une facture, unitaire ou en lot
- consultation d’une prédiction
- décision du gestionnaire (valider, rejeter, demander un complément)
- configuration (seuil, canaux)
- métriques
- `/health`

À faire :

- Valider toute entrée avec Pydantic : types, bornes de montants, codes d’actes connus du référentiel, dates cohérentes. Une facture invalide reçoit un code et un motif, plus une ligne d’audit. Elle ne produit pas d’erreur 500.
- Enchaîner : réception → prétraitement identique à l’entraînement → prédiction → SHAP → écriture en base → webhook n8n si le score dépasse le seuil.
- Authentifier (JWT ou session) et autoriser par rôle sur chaque route. Masquer un bouton dans l’interface ne remplace pas ce contrôle.
- Lire le seuil d’alerte dans la configuration en base, pour qu’un changement s’applique sans redémarrage.
- Exposer latence, volume, erreurs et distribution des scores.
- Écrire les tests : validation et prétraitement, flux complet sur une base de test, accès refusé pour un mauvais rôle.

Documents dont il est l’auteur, relus par le membre 1 :

- spécification OpenAPI, avec exemples de requêtes et codes d’erreur
- contrat de données : entrée, et sortie (`facture_id`, score, classe, version, SHAP)
- matrice des rôles : prestataire, assuré, gestionnaire, administrateur, et ce que chacun peut appeler

Rôles côté API, les écrans restant au membre 3 :

- prestataire : soumettre une facture ou un lot, lire son statut et les rejets
- assuré : lire l’état de ses remboursements, et seulement les siens
- gestionnaire : lire la file d’alertes, le rapport SHAP, enregistrer sa décision
- administrateur : seuil, canaux, versions du modèle, utilisateurs

Sortie : un lot de factures dégradées passe par l’API. Les valides sont scorées. Les invalides sont rejetées proprement.

---

## Phase 7 — Workflow n8n

But : une facture au-dessus du seuil produit une alerte reçue, sans donnée identifiante.

À faire :

- Créer le workflow : webhook de l’API → comparaison du score au seuil lu en configuration → message → Slack et/ou e-mail.
- Joindre au message le score, les principales contributions SHAP et un lien vers la facture. Le lien utilise `facture_id` et le pseudonyme, jamais le nom ni le CIN.
- Rendre les canaux modifiables par l’administrateur, via la configuration déjà exposée en phase 6.
- En cas d’échec : nouvelle tentative, file d’erreurs, journal de chaque envoi.
- Exporter le workflow en `.json`, le versionner dans `n8n/`, et tester son import sur une instance vierge.

Documents dont il est l’auteur, relus par le membre 3 :

- fiche du workflow : déclencheur, nœuds, paramètres, comportement en échec
- fichier `.json` et la procédure d’import

Sortie : une facture au-dessus du seuil déclenche une alerte avec le rapport d’explicabilité. Changer le seuil en base change le comportement sans redéployer.

---

## Phase 9 — Sa part de l’interface

Les écrans, le guide utilisateur et le tableau de bord BI sont au membre 3. Le membre 2 fournit les garanties côté serveur.

À faire :

- Vérifier que chaque action des quatre rôles est refusée par l’API quand le rôle ne correspond pas, y compris si l’écran affiche encore le bouton.
- Permettre à l’administrateur de changer le seuil en direct, avec une ligne dans le journal d’audit (ancienne valeur, nouvelle valeur, auteur, horodatage).
- Exposer à l’outil BI du membre 3 des vues en lecture : volumes, alertes par statut, décisions humaines, distribution des scores. Ces vues ne contiennent pas `est_fraude` comme si c’était une donnée de production, ni les colonnes de `identites_pii.csv`.
- Enregistrer la décision humaine du gestionnaire. Une alerte n’est jamais une sanction automatique.

Il attend du membre 3 les parcours à couvrir. Il ne dessine pas les maquettes.

Sortie côté membre 2 : les quatre rôles sont distingués par l’API, et le seuil change sans redémarrage.

---

## Phase 10 — Exploitation

But : la pile se sauvegarde, se restaure, se supervise, et change de modèle sans coupure. Le membre 2 pilote. Le membre 1 fournit l’indicateur de dérive.

À faire :

- Journaux structurés, métriques de latence, de volume et d’erreurs, consommables par l’écran d’administration.
- Brancher l’alerte de dérive : le membre 1 compare la distribution des variables et des scores à celle de l’entraînement (PSI ou Kolmogorov-Smirnov). Le membre 2 affiche le dépassement de seuil sur l’écran admin et le journalise.
- Scripter la sauvegarde quotidienne de PostgreSQL (données, vecteurs, audit) et une restauration complète, puis l’exécuter sur une machine propre.
- Redémarrer les conteneurs et vérifier que les données sont toujours là.
- Tester la mise à jour du modèle et le retour arrière sans interruption, déjà préparés en phase 5.
- Compléter la CI : tests, lint, scan des dépendances, build et démarrage de la pile.
- Rejouer le lot de factures dégradées.

Documents dont il est l’auteur, relus par le membre 3 :

- guide d’exploitation : installation, configuration, sauvegarde, restauration, supervision, mise à jour du modèle, retour arrière
- runbook : base indisponible, API lente, n8n sans alerte, dérive détectée, modèle défaillant. Pour chaque cas : symptôme, diagnostic, action, escalade
- plan de supervision : métriques, seuils, responsables

Sortie : une restauration depuis sauvegarde et un retour arrière du modèle sont démontrés devant un tiers.

---

## Phase 11 — Sa part sécurité

L’audit d’équité et la grille EU AI Act sont pilotés par le membre 1. Le membre 2 écrit les preuves techniques que cette grille cite.

À faire :

- Mots de passe hachés, JWT à durée limitée, secrets hors du dépôt.
- Limitation de débit, validation stricte des entrées, dépendances scannées en CI.
- Droits minimaux sur la base : l’API n’est pas superutilisateur ; le compte lu par l’agent du membre 3 est en lecture seule, limité à l’assuré de la session.
- Chiffrement de la table d’identités, journal d’audit sur ré-identification, changement de seuil et décision gestionnaire.
- Relire le modèle de menaces RAG écrit par le membre 3, en vérifiant que les outils SQL sont paramétrés et que l’identifiant d’assuré vient de la session.

Document : spécification des mécanismes de sécurité (authentification, autorisations, chiffrement, anti-injection côté API, audit, sauvegarde), co-signée avec le membre 1 pour la partie modèle.

Sortie : chaque exigence de sécurité de la grille renvoie vers un fichier du dépôt (migration, test, workflow ou configuration).

---

## Phase 13 — Sa part du bout en bout

Le dossier, les slides et le guide utilisateur final sont collectifs. Le membre 2 tient la répétition technique.

À faire :

- Sur une machine vierge : cloner le dépôt, `docker compose up`, `/health` répond.
- Charger un lot de 20 factures inédites, dont plusieurs invalides : les valides sont scorées, les invalides rejetées avec un motif.
- Chaîne : facture → prédiction → SHAP → stockage → notification n8n → décision du gestionnaire.
- Changer le seuil en direct, redémarrer les conteneurs, revenir à la version précédente du modèle.
- Vérifier les refus de permission pour les quatre rôles.
- Tenir son journal de contribution au fil de l’eau.

Sortie : la répétition complète réussit deux fois de suite sur une machine propre.

---

## Hors de sa charge

Il ne fait pas ces travaux. Il fournit les chiffres et les contrats que les autres consomment.

- Entraînement, choix du seuil métier, matrice de confusion, calcul SHAP : membre 1. Le membre 2 stocke et sert le résultat.
- Extraction des PDF, embeddings, agent, évaluation du RAG : membre 3. Le membre 2 fournit pgvector, le compte en lecture seule et la revue du modèle de menaces.
- Maquettes, écrans, dictionnaire des KPI, guide utilisateur : membre 3. Le membre 2 fournit les routes et les vues.
- Tableur FinOps et note d’hypothèses : membre 3. Le membre 2 fournit la latence d’inférence par facture et le coût de la base, mesurés en phase 10.

Relectures qui lui incombent : datasheet du membre 1, model card du membre 1, fiche RAG du membre 3.

---

## Ordre de réalisation

1. Phase 0 — contrat de données et schéma, avec le membre 1
2. Phase 1 — Docker, migrations, mock, `/health`, CI
3. Phase 2 — `raw` → `clean`, validation partagée avec l’API
4. Phase 3 — pseudonymisation et table d’identités chiffrée
5. Phase 6 sur le mock — routes, rôles, rejet des factures invalides
6. Phase 7 — n8n branché sur le mock
7. Phase 5 puis rebranchement de la phase 6 — quand le membre 1 livre le modèle et SHAP
8. Phase 9 — contrôles d’accès et seuil audité, en appui du membre 3
9. Phase 10 — sauvegarde, restauration, dérive, retour arrière
10. Phase 11 — preuves de sécurité
11. Phase 13 — répétition sur machine vierge

Le mock permet d’enchaîner 1 → 7 sans le modèle final. Le vrai modèle remplace le mock sans changer les routes.

## Documents dont il est l’auteur

- Phase 1 : README, schéma de données, tableau des variables d’environnement
- Phase 3 : registre des traitements, AIPD, note de pseudonymisation, procédure des droits
- Phase 6 : spécification OpenAPI, contrat de données, matrice des rôles
- Phase 7 : fiche du workflow n8n et fichier `.json`
- Phase 10 : guide d’exploitation, runbook, plan de supervision
- Phase 11 : spécification des mécanismes de sécurité

## Définition de terminé

- **Phase 0** : format de sortie du modèle et schéma écrits et acceptés.
- **Phase 1** : `docker compose up` et `/health` sur une machine propre.
- **Phase 2** : un script reconstruit `clean` depuis `raw` ; les labels ne sont pas dans les tables de l’API.
- **Phase 3** : le scan ne trouve aucun nom ni coordonnée hors de la table chiffrée.
- **Phase 5** : score, version et SHAP sont stockés ; le retour arrière ne coupe pas l’API.
- **Phase 6** : factures valides scorées, factures invalides rejetées sans erreur 500, mauvais rôle refusé.
- **Phase 7** : alerte reçue au-dessus du seuil, message sans identifiant direct, import du JSON vérifié.
- **Phase 9** : le seuil change en base avec une trace d’audit ; l’API distingue les quatre rôles.
- **Phase 10** : restauration et retour arrière démontrés.
- **Phase 11** : chaque contrôle de sécurité pointe vers un fichier du dépôt.
- **Phase 13** : la répétition passe deux fois sur une machine vierge.
