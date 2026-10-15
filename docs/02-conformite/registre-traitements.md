# Registre des traitements

Traitement : PrediCare TPA, contrôle des factures de tiers payant et score de suspicion de fraude. Le jeu utilisé est synthétique. Aucune personne réelle n'est enregistrée.

| Rubrique | Contenu |
|---|---|
| Finalité | Détecter une facture suspecte, expliquer le score, laisser un gestionnaire décider |
| Base | Jeu synthétique de démonstration. Sur des données réelles, le socle serait l'intérêt légitime de l'organisme d'assurance et l'obligation de lutte contre la fraude, avec une analyse d'impact |
| Responsable | L'organisme qui exploite la plateforme. Dans le cadre du projet, l'équipe capstone |
| Catégories | Données d'identité (coffre chiffré), données de couverture, données de santé liées aux soins facturés, score automatisé |
| Personnes | Assurés, prestataires, gestionnaires, administrateur |
| Destinataires | Gestionnaire (facture et score), agent documentaire (historique de l'assuré connecté), administrateur (ré-identification), membre 1 (labels, hors API) |
| Transferts | Aucun transfert prévu hors de la pile Docker locale |
| Durée | Identités : `retention_identites_years` dans `app.settings`, valeur initiale 5 ans après la fin de la relation. Factures pseudonymisées : durée d'exploitation du contrôle. Journaux d'audit : 1 an |
| Mesures | Coffre chiffré, pseudonyme HMAC, rôles séparés, audit de ré-identification, scan au chargement |

La clé HMAC et la clé de chiffrement sont dans l'environnement, pas dans la base.
