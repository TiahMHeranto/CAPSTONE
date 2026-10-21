# Guide utilisateur

PrediCare TPA contrôle les factures de tiers payant. Quatre rôles ouvrent la même adresse, `http://localhost:3000`. Le menu ne montre que les parcours du rôle connecté.

Un seul compte existe au démarrage : l'administrateur `predicare`, mot de passe `predicareAdmin`, adresse `predicare@prediccare.mg`. Les autres comptes se créent dans Utilisateurs. Un assuré ou un professionnel est rattaché à une personne de la liste. Aucun mot de passe n'est envoyé par e-mail : un administrateur réinitialise l'accès.

La session du gestionnaire et de l'administrateur se ferme après 15 minutes sans activité.

## Connexion

1. Ouvrir `http://localhost:3000`, puis « Se connecter ».
2. Saisir l'adresse e-mail et le mot de passe.
3. L'écran d'accueil dépend du rôle.

Le profil, commun aux quatre rôles, affiche la fiche du compte. « Modifier le mot de passe » reste fermé tant qu'on ne l'ouvre pas. Le mot de passe actuel, le nouveau (8 caractères au moins) et la confirmation sont demandés ensemble.

## Professionnel de santé

Parcours : déposer une facture, la faire contrôler, relire ses propres dépôts, interroger l'assistant.

1. Ouvrir Factures.
2. Déposer le PDF de la facture : glisser le fichier, ou cliquer la zone pour le choisir.
3. Appuyer sur « Scanner la facture ». Les champs se remplissent. Rien n'est scoré à cette étape.
4. Si une ordonnance accompagne la facture, déposer son PDF, scanner, vérifier les champs, puis confirmer. L'ordonnance n'est enregistrée qu'après cette confirmation.
5. Corriger les champs. La lecture d'un PDF ne conserve ni nom, ni adresse, ni téléphone, ni e-mail, ni CIN.
6. Déposer la facture, seule ou dans un lot d'au plus 50.
7. Une facture invalide est refusée avec un code et un motif (montant, dates, code inconnu, référence inconnue, doublon). Elle n'est pas scorée.
8. Une facture valide affiche le score, la classe, la version du modèle et les contributions qui expliquent le score.
9. Le professionnel ne relit ensuite que les factures qu'il a envoyées.

L'assistant répond aux questions sur les garanties et les remboursements, avec la source du contrat. Il ne donne pas accès aux factures d'un autre assuré.

## Assuré

Parcours : suivre ses remboursements et poser une question.

1. Le tableau de bord résume le contrat et les factures rattachées au compte.
2. Remboursements liste les factures de ce seul assuré : identifiant, statut, montant de la facture, montant pris en charge, reste à charge et motif de rejet.
3. L'assistant sert à suivre un remboursement ou à lire un barème. Une question hors de ce périmètre est refusée.

L'assuré ne dépose pas de facture et ne voit pas les alertes des autres dossiers.

## Gestionnaire

Parcours : traiter les alertes, trancher, suivre l'activité.

1. Alertes ouvre la file des scores en alerte encore sans décision.
2. Ouvrir la facture et le rapport d'explications. Si la facture cite une ordonnance, les anomalies de prescription (doublon, péremption, quantité, ligne absente, spécialité hors diagnostic) apparaissent à côté du score. Le texte du diagnostic n'est pas affiché.
3. Trancher : valider, rejeter, ou demander un complément. Le motif se choisit dans une liste. Après validation ou rejet, l'écran affiche une confirmation. La validation calcule le montant pris en charge selon le taux, la franchise et le plafond de la formule. Un rejet ne verse rien. La facture sort de la file d'alertes.
4. Remboursements reprend toutes les factures, avec le montant pris en charge et le reste à charge.
5. Le score ne rejette pas la facture à la place du gestionnaire.
6. Pilotage affiche les volumes, les alertes, les décisions, la répartition des scores, le montant des rejets confirmés et le taux de détection.

Le gestionnaire peut aussi déposer une facture. S'il confirme une ordonnance lue sur un PDF, la référence est reportée sur la facture ; la création de l'ordonnance reste au professionnel.

## Administrateur

Parcours du gestionnaire, plus le socle.

| Écran | Usage |
|---|---|
| Réglages | Seuil d'alerte, canaux de notification, adresse du workflow, seuil de dérive. Le prochain score utilise la nouvelle valeur, sans redémarrage |
| Modèles | Bascule entre `v1` et `v2`, ou retour à la version précédente, sans couper l'API |
| Supervision | Santé, volume, latence, erreurs, dérive |
| Utilisateurs | Création d'un compte (adresse e-mail obligatoire). Un assuré ou un professionnel est rattaché à une personne de la liste. Suppression logique : le compte reste en base, disparaît de la liste et ne peut plus se connecter |
| Identités | Ré-identification ou effacement d'un pseudonyme. L'acte est tracé, sans recopier le nom |
| Pilotage | Mêmes indicateurs que le gestionnaire |

Le seuil d'exemple 0,8 du cahier n'est pas une constante du score. La valeur qui décide d'une alerte est celle des réglages. Les secrets (clés, mots de passe de base) restent dans `.env`, pas dans cet écran.

## Ce que l'écran ne fait pas

Pas de second facteur. Pas d'export du tableau de bord. L'assuré voit le résultat sur Remboursements ; il ne reçoit pas de message séparé. Le canal de notification effectif, tant que les adresses Slack et e-mail ne sont pas renseignées, est le journal interne des alertes.
