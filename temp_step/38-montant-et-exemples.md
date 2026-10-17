# Montant de la dernière facture, et questions anticipées

## Fait

Le garde-fou ne traite plus toute question qui contient « facture » ou « dernier » comme une liste. Seuls les verbes de liste ou de détail (`liste`, `détail`, `montre`) exigent un `facture_id` ou un `ordonnance_id`. Une question qui demande un montant peut renvoyer `montant_total` seul.

L'analyse du dossier (comptages seulement, sans identité) sert de base aux exemples ajoutés :

- Factures : 84 593. Statuts `PAYEE` (79 775), `EN_COURS` (2 826), `REJETEE` (1 992).
- Types : consultation, pharmacie, laboratoire, imagerie, dentaire, kinésithérapie, maternité, optique, hospitalisation.
- Motifs de rejet : contrôle médical, pièce manquante, ordonnance périmée, délai de carence, hors période, plafond atteint, entente préalable absente, produit non remboursable.
- 47 804 ordonnances. Contrats `ACTIF` ou `RESILIE`, formules ESSENTIEL, CONFORT, PREMIUM.
- Le prestataire ne voit que ses factures et ses ordonnances. L'assuré voit aussi son profil et son contrat. L'annuaire des établissements n'est pas filtré par le jeton : aucun exemple ne demande « le nom de mon établissement » par un `SELECT` sur tout l'annuaire.

Exemples ajoutés pour l'assuré : montant, statut et date de la dernière facture, factures en cours, dépense de laboratoire, consultations, optique, dentaire, hospitalisation, date d'adhésion, ordonnances encore valides. Pour le prestataire : factures émises, factures en attente, ordonnances prescrites. Le schéma cite les valeurs réelles des statuts, types et motifs.

## Pourquoi

« Quel est le montant de mon dernier facture ? » était refusée trois fois parce que le SQL sans identifiant était pris pour un total. L'historique devenait illisible et le modèle répondait qu'il ne trouvait rien, alors que le détail de la même facture répondait. Les exemples proches guident le modèle vers la forme juste pour les questions qu'un assuré ou un prestataire peut poser sur son compte.

## Fichiers

- `backend/app/rag/sql_guard.py`
- `backend/app/rag/exemples_sql.json`
- `backend/app/rag/schema_dossier.json`
- `backend/app/services/assistant.py`
- `backend/tests/test_sql_guard.py`

## Vérification

`pytest tests/test_sql_guard.py tests/test_assistant.py` : 17 tests. « lister mes factures » et « détail de ma dernière facture » restent des listes. « montant de mon dernier facture » n'en est pas une, et l'exemple retenu commence par « Quel est le montant de ma dernière facture ? ». Cache `app.assistant_cache` vidé. Image `api` reconstruite pour que le conteneur lise le Python et le JSON.

## Ensuite

Reposer la question du montant sur le compte qui a déjà répondu au détail. Le rang bénéficiaire est vide sur les 4 459 lignes de `clean.assures` : le profil peut le renvoyer nul tant que ce remplissage n'est pas repris.
