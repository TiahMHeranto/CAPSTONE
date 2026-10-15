# Plan de charge — CohorteAI

Charge de travail pour analyser les données d’assurance santé, puis livrer une restitution exploitable. Ce document décrit le travail à faire. Il ne contient pas le code.

Périmètre des sources, dans `CohorteAI_datagen` :

- 12 tables CSV dans `dataset/`
- 2 fichiers de vérité terrain dans `labels/`
- corpus PDF dans `rag_corpus/` (conditions générales, conditions particulières, barème, guides réseau)
- exemples de factures et d’ordonnances PDF dans `exemple de facture et d_ordonnance/`

Volumes constatés :

| Table | Lignes | Rôle |
| --- | ---: | --- |
| `factures.csv` | 84 593 | En-tête de chaque demande de remboursement |
| `lignes_facture.csv` | 123 270 | Actes et médicaments facturés |
| `ordonnances.csv` | 47 804 | Prescription |
| `ordonnance_lignes.csv` | 82 175 | Lignes de prescription |
| `assures.csv` | 4 459 | Bénéficiaires, sans nom |
| `identites_pii.csv` | 4 459 | Nom, téléphone, e-mail, CIN |
| `contrats.csv` | 1 500 | Police, formule, prime, statut |
| `garanties.csv` | 27 | Règles de remboursement par formule et catégorie |
| `prestataires.csv` | 251 | Professionnels et établissements |
| `grille_tarifaire.csv` | 3 242 | Tarif pratiqué par prestataire et code |
| `referentiel_actes.csv` | 58 | Actes, bornes de tarif, règles |
| `referentiel_medicaments.csv` | 28 | Médicaments, prix de référence, remboursabilité |
| `labels/labels_fraude.csv` | 84 593 | Vérité terrain par facture : fraude, type, validité |
| `labels/labels_prestataires.csv` | 251 | Vérité terrain par prestataire : `est_suspect` |

Faits déjà visibles, à confirmer pendant l’analyse :

- devise unique : `MGA`
- statuts facture : `PAYEE` (79 775), `EN_COURS` (2 826), `REJETEE` (1 992)
- formules : `ESSENTIEL`, `CONFORT`, `PREMIUM`
- contrats : `ACTIF` (1 391), `RESILIE` (109)
- tous les prestataires du fichier sont conventionnés
- fraudes étiquetées : 7 347 factures (`est_fraude = 1`), soit environ 8,7 %, sur 14 types
- parmi ces fraudes : 5 709 sont `PAYEE`, 1 389 sont `REJETEE`, 249 sont `EN_COURS`
- 603 factures `REJETEE` ne sont pas des fraudes
- `est_valide` vaut 1 sur les 84 593 lignes, et `motif_invalidite` est vide partout
- prestataires suspects : 10 (`est_suspect = 1`)

---

## 1. Cadrage

But : fixer la question métier et le grain d’analyse avant de toucher aux fichiers.

- Formuler la question principale : quelles factures sont frauduleuses (`est_fraude`), où part l’argent (sinistralité, y compris les fraudes déjà payées), ce qui reste à la charge de l’assuré, et si le montant facturé respecte le barème et la garantie.
- Fixer quatre grains, et ne pas les mélanger dans un même indicateur :
  - facture (`facture_id`)
  - assuré (`assure_id`)
  - contrat (`contrat_id`)
  - prestataire (`prestataire_id`)
- Séparer trois familles de champs, et ne pas les mélanger :
  - décision de gestion : `statut`, `motif_rejet`, `montant_pris_en_charge`, `reste_a_charge`, `date_traitement`
  - règles : `garanties.csv`, `referentiel_actes.csv`, `referentiel_medicaments.csv`, `grille_tarifaire.csv`
  - vérité terrain : `labels/`, réservée à l’évaluation. `est_fraude` n’est pas une variable du modèle. `REJETEE` n’est pas un synonyme de fraude.
- Isoler `identites_pii.csv`. Nom, prénoms, téléphone, e-mail, adresse et `numero_cin` ne entrent dans aucune table d’analyse, aucun graphique et aucun modèle.
- Lister les décisions que le livrable doit permettre : prioriser un contrôle de fraude, expliquer un type de fraude, comparer une formule, repérer un écart de tarif. Le taux de rejet reste un indicateur de gestion, à part.

Sortie attendue : une page qui nomme la question, les grains, les tables interdites en sortie, et les décisions que les chiffres doivent éclairer.

---

## 2. Inventaire des sources

But : savoir à quoi sert chaque fichier et comment les relier, avant le nettoyage.

### Tables et clés

- `factures.csv` — une demande. Clé `facture_id`. Liens : `prestataire_id`, `assure_id`, `contrat_id`, `ordonnance_id` (parfois vide).
- `lignes_facture.csv` — le détail. Clé `ligne_id`. Lien `facture_id`. Le champ `code` pointe vers un acte ou un médicament selon `type_ligne`.
- `assures.csv` — le bénéficiaire. Clé `assure_id`. Lien `contrat_id`. `assure_principal_id` relie un ayant droit à l’assuré principal. `rang_beneficiaire` distingue principal, enfant, et les autres rangs.
- `contrats.csv` — la police. Clé `contrat_id`. `formule` joint `garanties.csv`. `prime_annuelle_totale` sert au ratio sinistres / prime.
- `garanties.csv` — pas une clé unique simple. La clé métier est le couple `formule` + `categorie`. Une ligne porte le taux, le plafond de catégorie, la franchise, le délai de carence, le plafond global, la prime par bénéficiaire, l’attestation, les actes exclus et les pièces.
- `prestataires.csv` — clé `prestataire_id`. Ville, type, horaires, niveau de tarif, convention.
- `grille_tarifaire.csv` — clé métier `prestataire_id` + `code`. C’est le prix pratiqué, pas le prix de référence.
- `referentiel_actes.csv` — clé `code_acte`. Bornes `tarif_min`, `tarif_reference`, `tarif_max`, plus `ordonnance_requise`, `entente_prealable`, `sexe_requis`, `age_min`, `age_max`.
- `referentiel_medicaments.csv` — clé `code_medicament`. `prix_reference`, `remboursable`, `chronique`.
- `ordonnances.csv` — clé `ordonnance_id`. Liens `assure_id` et `prescripteur_id` (un prestataire). `validite_jours` et `date_prescription` servent au contrôle des 10 jours.
- `ordonnance_lignes.csv` — clé métier `ordonnance_id` + `num_ligne`.
- `identites_pii.csv` — clé `assure_id`. Réservé au contrôle d’existence. Ne pas l’exporter.
- `labels/labels_fraude.csv` — clé `facture_id`, une ligne par facture. Colonnes : `est_fraude` (0/1), `type_fraude`, `detail_fraude`, `est_valide` (0/1), `motif_invalidite`. C’est la réponse connue pour la matrice de confusion. Elle ne décrit pas une pièce à prédire à partir d’elle-même.
- `labels/labels_prestataires.csv` — clé `prestataire_id`, une ligne par prestataire. Colonne `est_suspect` (0/1). Dix prestataires sont marqués. Ce fichier sert de tranche d’évaluation, pas de seconde cible d’entraînement.

Les colonnes de décision (`statut`, `motif_rejet`, `montant_pris_en_charge`, `date_traitement`) et toutes les colonnes de `labels/` restent hors des variables du modèle. Le dictionnaire les signale comme liées, en partie seulement, à la fraude.

### Jointures à écrire

- facture → assuré, contrat, prestataire, ordonnance
- facture → lignes
- facture → `labels_fraude` (1 pour 1, au moment de l’évaluation seulement)
- prestataire → `labels_prestataires` (1 pour 1, au moment de l’évaluation seulement)
- contrat.`formule` + facture.`type_facture` → garantie.`categorie`
- ligne.`code` + ligne.`type_ligne` → référentiel acte ou médicament
- prestataire + code → grille tarifaire
- ordonnance → lignes d’ordonnance
- assuré.`contrat_id` doit être le même contrat que facture.`contrat_id`

### Documents, traités après le tabulaire

- `rag_corpus/Conditions_Generales_ESSENTIEL.pdf`, `CONFORT`, `PREMIUM`
- `rag_corpus/conditions_particulieres/CP_CTR-*.pdf`
- `rag_corpus/Bareme_Reference_Actes.pdf`
- `rag_corpus/Guide_Reseau_Soins_National.pdf` et `Guide_Reseau_Soins_Antananarivo.pdf`
- PDF d’exemples `FAC-*.pdf` et `ORD-*.pdf`

Sortie attendue : un schéma des liens (une facture au centre) et la liste des champs utilisés par la suite. Un lien qu’on ne sait pas justifier ne part pas dans le jeu analytique.

---

## 3. Nettoyage

But : lire les 12 CSV de `dataset/` et les 2 CSV de `labels/` avec pandas, et obtenir des types stables, sans doublon de clé, avec un statut clair pour chaque valeur manquante.

### Lecture

- Lire chaque CSV avec pandas, en forçant l’encodage et le séparateur constatés (virgule).
- Ne pas laisser pandas deviner les dates : parser explicitement chaque colonne de date.
- Garder les identifiants en texte (`FAC-…`, `ASS-…`, `CTR-…`, `PRE-…`, `ORD-…`), jamais en nombre.

### Types à figer

- Dates facture : `date_soin`, `date_facture`, `date_reception`, `date_traitement`.
- Heure : `heure_soin`.
- Dates assuré : `date_adhesion`, `date_radiation`, et `date_naissance` seulement dans le fichier PII.
- Dates contrat : `date_effet_police`, `date_effet`, `date_fin`.
- Dates prestataire : `date_conventionnement`, `date_fin_convention`.
- Dates ordonnance : `date_prescription`.
- Montants en entier MGA : `montant_total`, `montant_eligible`, `montant_pris_en_charge`, `reste_a_charge`, `prix_unitaire`, `montant`, primes, plafonds, tarifs.
- Catégories fermées, à contrôler contre la liste réelle :
  - facture : `type_facture`, `statut`, `canal_reception`, `mode_reglement`, `devise`, `motif_rejet`
  - contrat : `formule`, `statut`, `secteur`
  - assuré : `sexe`, `rang_beneficiaire`, `ville`
  - ligne : `type_ligne` (`ACTE` ou médicament)
  - prestataire : `type_prestataire`, `niveau_tarif`, `statut`
  - labels : `est_fraude`, `est_valide`, `est_suspect` en 0/1 ; `type_fraude` dans la liste des 14 types quand la facture est frauduleuse

### Doublons

- Unicité stricte : `facture_id` (dans `factures.csv` et dans `labels_fraude.csv`), `ligne_id`, `assure_id`, `contrat_id`, `prestataire_id` (dans `prestataires.csv` et dans `labels_prestataires.csv`), `ordonnance_id`, `code_acte`, `code_medicament`.
- Unicité métier : `formule` + `categorie` dans les garanties, `prestataire_id` + `code` dans la grille, `ordonnance_id` + `num_ligne` dans les deux tables de lignes.
- `numero_facture` peut se répéter ou non : le mesurer, ne pas le supposer unique.
- Compter les doublons, les sortir dans un fichier d’anomalies, ne pas les supprimer en silence.

### Valeurs manquantes

Distinguer un trou réel d’un vide normal.

- Vide normal :
  - `motif_rejet` vide quand `statut` n’est pas `REJETEE`
  - `date_radiation` vide si l’assuré est encore couvert
  - `date_fin` vide si le contrat est `ACTIF`
  - `date_fin_convention` vide si le prestataire est `ACTIF`
  - `ordonnance_id` vide si le type de facture n’exige pas d’ordonnance
  - téléphone, e-mail, CIN vides pour une partie des ayants droit dans le fichier PII
  - `type_fraude` et `detail_fraude` vides quand `est_fraude = 0`
  - `motif_invalidite` vide : constaté sur les 84 593 lignes, en même temps que `est_valide = 1`. C’est un fait du jeu, pas un trou à remplir et pas une cible de modèle
- Trou à expliquer :
  - clé étrangère vide alors que la règle l’exige (`ordonnance_id`, `attestation_pec_id`, `entente_prealable_id`)
  - montant manquant
  - date de soin ou date de facture manquante
  - `formule` ou `categorie` inconnue au regard des garanties
  - `est_fraude = 1` avec `type_fraude` vide, ou `est_fraude = 0` avec un `type_fraude` renseigné
- Produire un tableau : table, colonne, nombre de vides, part, verdict `normal` ou `à traiter`.

### Formats

- Villes : mêmes graphies (`Antananarivo`, `Toamasina`, et les autres). Pas de variante d’accent ou de casse.
- Téléphone et CIN : contrôle de forme uniquement dans `identites_pii.csv`, sans recopier les valeurs dans le rapport.
- `actes_exclus` dans les garanties est une liste séparée par `|` : la découper en lignes pour pouvoir tester un code.
- `jours_ouverture` est un masque, pas un libellé : le documenter avant de l’interpréter.

Sortie attendue : 12 tables métier et 2 tables de labels typées, un rapport de doublons, un rapport de manquants avec verdict, et zéro identifiant PII dans les tables de travail.

---

## 4. Cohérence

But : vérifier que les tables racontent la même histoire. Une anomalie se compte et se conserve. Elle ne se corrige pas sans règle écrite.

### Montants

Sur `factures.csv` et `lignes_facture.csv` :

- la somme des `montant` de lignes égale `montant_total`
- `nb_lignes` égale le nombre de lignes
- `montant_eligible` est compris entre 0 et `montant_total`
- `montant_pris_en_charge` + `reste_a_charge` est cohérent avec `montant_eligible` (écarts listés, pas écrasés)
- quantités et prix unitaires positifs, et `quantite * prix_unitaire = montant`
- `devise` vaut `MGA` partout

### Liens

- chaque `assure_id`, `contrat_id`, `prestataire_id` de facture existe dans sa table
- chaque `ordonnance_id` non vide existe dans `ordonnances.csv`
- chaque ligne de facture a une facture, et inversement
- `assures.contrat_id` et `factures.contrat_id` concordent pour le même assuré
- `prescripteur_id` existe dans `prestataires.csv`
- le `code` d’une ligne `ACTE` existe dans `referentiel_actes.csv`
- le `code` d’une ligne médicament existe dans `referentiel_medicaments.csv`
- le couple prestataire + code existe dans `grille_tarifaire.csv`, ou l’écart est listé
- chaque `facture_id` a exactement une ligne dans `labels_fraude.csv`, et chaque label a une facture
- chaque `prestataire_id` a exactement une ligne dans `labels_prestataires.csv`, et chaque label a un prestataire
- `est_fraude = 1` implique un `type_fraude` parmi les 14 types ; `est_fraude = 0` implique `type_fraude` et `detail_fraude` vides
- une facture `REJETEE` n’est pas comptée comme fraude. Le croisement se mesure : 5 709 fraudes sont déjà `PAYEE`, 1 389 sont `REJETEE`, 249 sont `EN_COURS`, et 603 rejets ne sont pas des fraudes

### Dates

Ordre attendu : `date_soin` ≤ `date_facture` ≤ `date_reception` ≤ `date_traitement`.

- le soin tombe entre `date_effet` et `date_fin` du contrat (fin vide = toujours ouvert)
- le soin tombe entre `date_adhesion` et `date_radiation` de l’assuré
- le délai `date_prescription` → `date_soin` respecte `validite_jours` (souvent 10)
- le délai depuis `date_adhesion` respecte `delai_carence_jours` de la garantie
- l’heure de soin tombe dans `heure_ouverture` / `heure_fermeture`, avec le cas `24H/24` traité à part
- une facture `PAYEE` ou `REJETEE` a une `date_traitement` ; une facture `EN_COURS` peut ne pas en avoir

### Règles de garantie et de référentiel

- le taux réel `montant_pris_en_charge / montant_eligible` est proche de `taux_remboursement` de la garantie de la formule et de la catégorie
- la franchise `franchise_par_facture` est visible dans le reste à charge quand elle s’applique
- le cumul annuel par assuré, formule et catégorie ne dépasse `plafond_annuel_categorie` que dans les cas déjà marqués `PLAFOND_ATTEINT`, ou l’écart est listé
- le cumul tous postes respecte `plafond_annuel_global`
- un acte listé dans `actes_exclus` n’est pas pris en charge
- un médicament `remboursable = 0` n’est pas pris en charge (`PRODUIT_NON_REMBOURSABLE`)
- si `ordonnance_requise = 1`, `ordonnance_id` est renseigné
- si `entente_prealable = 1`, `entente_prealable_id` est renseigné, sinon le motif `ENTENTE_PREALABLE_ABSENTE` est cohérent
- si `attestation_requise = 1`, `attestation_pec_id` est renseigné, sinon le motif `PIECE_MANQUANTE_ATTESTATION` est cohérent
- `sexe_requis`, `age_min` et `age_max` sont compatibles avec `sexe` et `annee_naissance` (l’âge se calcule à `date_soin`, sans la date de naissance du fichier PII)
- le prix unitaire facturé est comparé à `tarif_min` / `tarif_reference` / `tarif_max` et à `tarif_pratique`

### Motifs de rejet déjà dans les données

Les contrôler un par un, sans les réécrire :

- `CONTROLE_MEDICAL`
- `PIECE_MANQUANTE_ATTESTATION`
- `ORDONNANCE_PERIMEE`
- `DELAI_DE_CARENCE`
- `HORS_PERIODE_COUVERTURE`
- `PLAFOND_ATTEINT`
- `ENTENTE_PREALABLE_ABSENTE`
- `PRODUIT_NON_REMBOURSABLE`

Une facture `REJETEE` a un motif. Une facture `PAYEE` n’en a pas. Une facture `EN_COURS` n’est pas mélangée aux rejetées dans le taux de rejet. Le motif de rejet décrit la décision du gestionnaire. Il ne remplace pas `type_fraude`.

Sortie attendue : un registre d’anomalies (règle, table, identifiant, valeur constatée, valeur attendue) et un compte par règle. Le registre est la matière des indicateurs de qualité.

---

## 5. Exploration

But : décrire le portefeuille avant tout modèle. Chaque chiffre a un grain, une période et un filtre écrits à côté.

### Volumes

- nombre de factures, d’assurés, de contrats et de prestataires
- répartition de `type_facture` : consultation, pharmacie, laboratoire, imagerie, dentaire, kinésithérapie, maternité, optique, hospitalisation
- répartition des formules et des statuts de contrat
- répartition des canaux : `PAPIER_SCAN`, `PORTAIL_PRESTATAIRE`, `EMAIL`
- répartition des modes : `TIERS_PAYANT`, `REMBOURSEMENT_ASSURE`
- répartition par ville d’assuré et ville de prestataire (7 villes côté prestataires)
- pyramide simple : sexe, âge à partir de `annee_naissance`, rang bénéficiaire

### Délais

- soin → facture
- facture → réception
- réception → traitement
- les délais par canal, par type de facture et par statut

### Argent

- somme et médiane de `montant_total`, `montant_eligible`, `montant_pris_en_charge`, `reste_a_charge`
- par type de facture, par formule, par ville, par prestataire
- taux de prise en charge réel contre `taux_remboursement` de la garantie
- reste à charge moyen par formule
- sinistralités : somme prise en charge / `prime_annuelle_totale`, au grain contrat et au grain formule
- comparer la prime contrat à `prime_annuelle_par_beneficiaire * nb_beneficiaires`

### Rejets

- taux de rejet = `REJETEE` / ( `PAYEE` + `REJETEE` ), `EN_COURS` à part
- part de chaque `motif_rejet`
- profil des rejetées : type, formule, canal, prestataire, délai, présence d’ordonnance
- ce bloc décrit la gestion. Il ne sert pas de substitut au taux de fraude

### Fraude (vérité terrain, lecture seule)

- taux de fraude = nombre de `est_fraude = 1` / nombre de factures (environ 7 347 / 84 593)
- répartition des 14 `type_fraude` : surfacturation, doublon, upcoding, lignes non prescrites, quantité excessive, ordonnance expirée, acte fictif, surconsommation, incohérence de profil, substitution de produit, fractionnement, soin un jour fermé, hors couverture, prestataire radié
- montants `montant_total` et `montant_pris_en_charge` des fraudes déjà `PAYEE` (5 709 factures) : argent sorti alors que le label dit fraude
- croisement `est_fraude` × `statut`, pour montrer que les deux colonnes divergent
- part du montant de fraude portée par les 10 prestataires `est_suspect = 1`
- `est_valide` et `motif_invalidite` : constater qu’ils n’apportent aucune classe négative, puis ne pas les explorer comme une cible

### Prestataires et tarifs

- volume et montant par `type_prestataire` et par `niveau_tarif`
- écart `prix_unitaire` − `tarif_reference` et écart `prix_unitaire` − `tarif_pratique`
- concentration : part des montants portée par les prestataires les plus actifs

Sortie attendue : un cahier d’exploration, une question par page, avec le filtre et le grain. Pas de modèle dans cette étape.

---

## 6. Jeu analytique

But : une table de faits, et quelques tables de dimensions, stables d’un indicateur à l’autre.

- Construire une ligne par `ligne_id`, enrichie de la facture, de l’assuré (sans PII), du contrat, de la garantie, du prestataire, du référentiel et de la grille.
- Garder aussi une table au grain facture pour les indicateurs qui ne doivent pas être multipliés par le nombre de lignes (délai, statut, motif).
- Séparer la table de variables et la table d’évaluation :
  - variables : tout ce qui est connu avant la décision, plus les signaux de règles (écart de tarif, quantité, ordonnance, jour d’ouverture, âge, sexe)
  - hors variables : `est_fraude`, `type_fraude`, `detail_fraude`, `est_valide`, `motif_invalidite`, `est_suspect`, `statut`, `motif_rejet`, `montant_pris_en_charge`, `reste_a_charge`, `date_traitement`
  - évaluation : une table au grain facture qui porte `facture_id`, `date_soin` et `est_fraude` (et `type_fraude` pour lire les erreurs). On ne la joint aux variables qu’au moment du test
- Colonnes dérivées minimales :
  - âge à la date de soin, à partir de `annee_naissance`
  - délais en jours sur la chaîne de dates
  - taux de prise en charge réel
  - écart au tarif de référence et au tarif pratiqué
  - indicateurs oui/non des règles de la section 4 (ordonnance manquante, hors plafond, hors période, acte exclu)
  - année et mois de `date_soin` pour les cumuls
- Cumuls annuels par assuré et par catégorie, calculés dans l’ordre de `date_soin`, pour tester les plafonds sans fuite d’information.
- Figer le schéma : nom, type, grain, source. Une colonne sans source ne reste pas.
- Exclure toute colonne issue de `identites_pii.csv`.
- Versionner l’extraction (date, nombre de lignes, nombre d’anomalies) pour pouvoir comparer deux traitements.

Sortie attendue : `faits_lignes` et `faits_factures` sans label, une table `eval_factures` qui porte le label, un dictionnaire de colonnes qui marque chaque champ `variable` ou `évaluation`, et un contrôle que les montants somment encore aux totaux de `factures.csv`.

---

## 7. Indicateurs et restitutions

But : une liste courte d’indicateurs, chacun traçable jusqu’à une colonne du jeu analytique. Les graphiques viennent après la définition de l’indicateur.

### Indicateurs à calculer

- portefeuille : assurés, contrats actifs, bénéficiaires moyens, prime totale
- activité : factures, lignes, montant total, montant pris en charge, reste à charge
- qualité de gestion : part de factures `EN_COURS`, délai médian de traitement, part de `PAPIER_SCAN`
- qualité de données : nombre d’anomalies par règle de la section 4
- couverture : taux de prise en charge réel par formule et par catégorie, face au taux de garantie
- rejet : taux de rejet et répartition des motifs (gestion, séparé de la fraude)
- fraude : taux de fraude, montant des fraudes `PAYEE`, répartition des 14 types, part du montant portée par les 10 prestataires suspects
- équilibre : sinistres / prime par formule et par contrat
- réseau : montant et écart de tarif par prestataire et par ville
- plafonds : assurés proches du plafond de catégorie ou du plafond global

### Graphiques à produire, un par indicateur

- barres des montants par `type_facture` et par formule
- courbe mensuelle des montants pris en charge
- barres des motifs de rejet
- barres des 14 types de fraude, et barres du montant de fraude déjà payé
- distribution des délais par canal
- nuage ou barres d’écart de tarif par type de prestataire
- comparaison taux réel / taux de garantie

Chaque graphique indique le grain, la période, le filtre (`PAYEE` seules, ou toutes), et l’unité `MGA`.

Sortie attendue : un tableau indicateur → formule → grain → graphique, et les chiffres calculés une première fois sur le jeu figé. Pas de mise en forme produit dans cette étape.

---

## 8. Modélisation

But : détecter `est_fraude` au grain facture. Les règles de la section 4 restent la baseline. Pas d’entraînement tant que le jeu analytique et les indicateurs ne sont pas figés. On n’entraîne pas un modèle à prédire `REJETEE` : 5 709 fraudes sont déjà payées, et 603 rejets ne sont pas des fraudes.

Cas, dans cet ordre :

1. Détection de fraude. Cible : `est_fraude` (7 347 positifs, environ 8,7 %). Les factures `EN_COURS` restent dans le périmètre, parce qu’elles ont un label. Métriques écrites avant l’entraînement : précision, rappel, matrice de confusion (vrai positif, faux positif, faux négatif, vrai négatif), aire sous la courbe précision-rappel. L’exactitude seule ne suffit pas, le déséquilibre est fort.
2. Écart tarifaire, en appui. Repérer les lignes dont le prix s’éloigne du référentiel et de la grille (hors `tarif_min` / `tarif_max`, écart à `tarif_pratique`). C’est un signal de la baseline, en particulier pour `SURFACTURATION`, pas la cible de la matrice.
3. Lecture du coût, en appui. Décrire `montant_pris_en_charge` des fraudes `PAYEE` par type de fraude et par formule. C’est une lecture de l’argent déjà sorti, pas un tarif à appliquer, et cette colonne ne rentre pas dans les variables du modèle.

`est_valide` n’est pas une cible : la colonne vaut 1 partout, `motif_invalidite` est vide. Les 10 prestataires `est_suspect` servent de tranche pour lire précision et rappel sur ce sous-ensemble. Avec 10 positifs, ils ne font pas l’objet d’un second modèle.

Règles communes :

- séparer apprentissage et test par le temps (`date_soin`), pas par un tirage au hasard qui mélange les mois
- le label `est_fraude` ne sert qu’à l’apprentissage de la cible et au calcul de la matrice sur le test. `type_fraude` et `detail_fraude` servent à lire les erreurs après coup. Aucun des trois n’est une variable
- hors variables, en plus des labels : `statut`, `motif_rejet`, `montant_pris_en_charge`, `reste_a_charge`, `date_traitement`, `est_suspect`
- ne pas utiliser de colonne PII
- baseline avant tout algorithme : les signaux décrits dans le dictionnaire et contrôlés en section 4 (prix hors barème, quantité face à l’ordonnance, code absent de l’ordonnance, ordonnance expirée, soin un jour de fermeture, acte incompatible avec l’âge ou le sexe, soin hors période de couverture, facturation après fin de convention, doublon, fractionnement, réutilisation d’ordonnance)
- écrire le seuil de score retenu avant de regarder le jeu de test

Sortie attendue : une fiche (question, entrées autorisées, baseline règle, métriques, matrice de confusion sur le test, décision garder ou écarter). Un modèle qui ne bat pas la baseline sur le rappel et la précision ne part pas au déploiement.

---

## 9. Documents

But : relier une décision chiffrée au texte du contrat. Cette charge commence seulement quand les sections 3 à 7 sont stables.

- Lire les conditions générales des trois formules et en extraire, par catégorie, le taux, les plafonds, la carence, les exclusions et les pièces. Les comparer à `garanties.csv`. Un écart texte / table est une anomalie de référentiel.
- Lire le barème PDF et le comparer à `referentiel_actes.csv` (`tarif_min`, `tarif_reference`, `tarif_max`).
- Lire les deux guides réseau et les comparer à `prestataires.csv` (ville, convention, type).
- Pour un échantillon de conditions particulières `CP_CTR-*.pdf`, vérifier que le contrat CSV correspondant a la même formule et les mêmes dates.
- Sur un petit échantillon de PDF `FAC-*.pdf` et `ORD-*.pdf`, vérifier que les champs lus (numéro, date, montants, lignes) retrouvent la ligne CSV du même identifiant. Cela mesure la confiance dans la pièce, pas encore un outil d’extraction généralisé.
- Une réponse sur une garantie cite le document et la ligne de `garanties.csv`. Elle ne reformule pas la règle de mémoire.

Sortie attendue : un écart texte / table par document de référence, et un échantillon de pièces PDF rapprochées du CSV. Le corpus ne remplace pas le jeu analytique.

---

## 10. Déploiement

But : quelqu’un d’autre peut relancer la chaîne et lire les mêmes indicateurs.

- Environnement : versions de Python et des bibliothèques figées (`pandas` pour les tables, outil de graphiques retenu dans la section 7).
- Pipeline en ordre fixe : lecture → types → doublons et manquants → règles de cohérence → jeu analytique → indicateurs → score de fraude. Une étape en échec s’arrête et écrit le rapport d’anomalies.
- Données : les CSV sources, y compris `labels/`, restent en lecture seule. Les tables de travail et le registre d’anomalies vont dans un dossier de sortie distinct, sans `identites_pii.csv`. Le score livré s’applique à une facture qui n’a pas encore de `est_fraude`.
- Restitution : un notebook qui enchaîne le pipeline, plus un petit tableau de bord qui affiche les indicateurs de la section 7 (filtres formule, type de facture, période, statut) et le score de fraude.
- Le tableau de bord lit le jeu figé. Il ne relit pas les CSV bruts à chaque clic, il n’affiche aucun champ PII, et il ne présente pas `est_fraude` comme une donnée de production. La matrice de confusion reste un artefact du jeu de test, là où le label est connu.
- Conteneur : une image qui lance le pipeline puis le tableau de bord, avec les chemins de données en paramètres.
- Contrôles avant livraison :
  - les totaux du tableau de bord égalent les totaux du jeu analytique
  - un filtre formule ne mélange pas les catégories de garantie
  - `EN_COURS` n’entre pas dans le taux de rejet
  - le taux de fraude affiché en évaluation utilise `est_fraude`, pas `REJETEE`
  - le dossier livré ne contient ni CIN, ni e-mail, ni téléphone
  - la fiche modèle montre la matrice de confusion sur le test et qu’elle bat la baseline de la section 8

Sortie attendue : une commande qui reconstruit les indicateurs à partir des CSV, un score calculé sans `est_fraude`, et un écran qui permet de filtrer formule, type et période sans changer les chiffres de référence.

---

## Ordre de réalisation

1. Cadrage
2. Inventaire
3. Nettoyage
4. Cohérence
5. Exploration
6. Jeu analytique
7. Indicateurs
8. Modélisation, seulement si une fiche de la section 8 le justifie
9. Documents
10. Déploiement

On ne saute pas de 3 à 8. Le déploiement rejoue 3 → 7, il ne les remplace pas.

## Définition de terminé

- **Cadrage** : question de fraude, grains, trois familles de champs, et interdiction PII écrits.
- **Inventaire** : chaque CSV, y compris les deux fichiers de `labels/`, a un rôle, une clé et ses jointures. Les labels sont marqués évaluation seule.
- **Nettoyage** : types figés, doublons comptés, manquants classés normal ou à traiter. `est_valide` constant est documenté comme un fait, pas imputé.
- **Cohérence** : registre d’anomalies produit, motifs de rejet contrôlés, jointure 1 pour 1 des labels, et `REJETEE` non assimilé à une fraude.
- **Exploration** : cahier avec grain, période et filtre sur chaque chiffre, taux de fraude séparé du taux de rejet.
- **Jeu analytique** : tables de variables sans label ni colonnes de décision, table `eval_factures` à part, totaux réconciliés, sans PII.
- **Indicateurs** : liste indicateur → formule → graphique, chiffres de fraude et de gestion calculés une fois, sans les mélanger.
- **Modélisation** : fiche de détection de `est_fraude`, baseline des signaux du dictionnaire, matrice de confusion sur le test temporel, décision garder ou écarter. `est_valide` n’est pas une cible.
- **Documents** : écarts texte / table et échantillon PDF rapproché du CSV.
- **Déploiement** : une commande reconstruit les indicateurs, le score part sans `est_fraude`, la matrice reste sur le test, le tableau de bord filtre sans dérive, le livrable ne contient pas le fichier d’identités.
