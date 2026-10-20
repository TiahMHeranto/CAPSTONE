# Support de soutenance

Texte des planches. Une idée par planche. Les chiffres de modèle viennent des fiches `v1` et `v2`. Les montants FinOps sont ceux du dossier, hypothèses comprises. Ne pas les présenter comme une facture.

Durée visée : 15 minutes, puis les questions. Les trois voix parlent. L'ordre proposé suit le cahier : métier, produit, industrialisation, argent, éthique, difficultés.

---

## 1. PrediCare TPA

Contrôle des factures de tiers payant, explication du score, alerte, décision humaine, assistant sur le contrat.

Données synthétiques. Aucune donnée de santé réelle.

Orange Digital Center et Ingedata. Équipe de trois.

---

## 2. Le problème

Des milliers de factures et d'ordonnances. Le contrôle manuel est lent.

Le cahier situe la fraude et les erreurs de tarification entre 8 % et 15 % des remboursements du secteur. Ce n'est pas notre taux mesuré.

Les assurés et les professionnels saturent l'assistance pour un remboursement ou un barème.

---

## 3. Ce que la plateforme fait

Quatre rôles, une adresse.

Le professionnel dépose. L'API valide, score, explique.

Le gestionnaire tranche : valider, rejeter, complément.

L'assuré suit ses remboursements et interroge l'assistant.

L'administrateur règle le seuil, les canaux et la version du modèle.

---

## 4. Démonstration

Montrer, dans cet ordre, sans terminal :

1. Connexion administrateur `predicare`. Les autres rôles se créent dans Utilisateurs. Dépôt d'une facture. Score, classe, contributions.
2. Facture invalide : un code et un motif, pas une erreur.
3. Connexion gestionnaire. File d'alertes. Une décision.
4. Pilotage : volumes, taux de détection, montant des rejets confirmés.
5. Connexion assuré. Un remboursement. Une question à l'assistant, avec la source.
6. Réglages : changer le seuil. Le dire à voix haute : la valeur 0,8 du cahier n'est pas écrite dans le score.

---

## 5. Le score

XGBoost, 23 variables de facture et d'ordonnance. Pas de nom, pas de sexe, pas d'âge.

Version active `v2`. Jeu de test temporel, 12 689 factures.

Rappel 0,947. Précision 0,874. 9,3 % des factures en alerte.

`v1` reste chargée. Le retour se fait dans l'écran, sans couper l'API.

Chaque alerte porte un rapport SHAP.

---

## 6. Une plateforme, une commande

`docker compose up` lance la base, l'API, l'écran, n8n et Superset.

Les données survivent au redémarrage. La sauvegarde et la restauration sont scriptées.

`/health`, les journaux, la latence, le volume, les erreurs, la dérive.

Une facture inconnue du jury le jour J suit le même chemin. Si elle est invalide, elle est refusée proprement.

---

## 7. L'argent

Le coût qui compte est la revue humaine, pas le serveur.

Scénario du dossier, à dire comme un scénario : environ 3 930 alertes par an sur le volume du jeu, quelques minutes chacune.

Le cache sémantique évite de repayer une question déjà posée. Sur ce volume, il économise quelques dizaines d'euros. Il est là parce que le cahier le demande, et parce que la facture de jetons ne doit pas dériver.

L'économie réelle est le montant des rejets confirmés, lu dans Pilotage. Tant qu'aucun rejet n'est confirmé, cet indicateur vaut 0. On ne le remplace pas par le 8 % du secteur.

---

## 8. Confiance

Pseudonymes. Identités dans un coffre chiffré.

Le score ne refuse pas un remboursement. Un gestionnaire le fait.

L'assistant ne lit que l'assuré connecté. Une question hors sujet est refusée avant le modèle.

L'audit d'équité constate que le sexe et l'âge ne sont pas des variables. Il ne prétend pas avoir mesuré un écart par groupe : cette mesure n'est pas dans le dépôt. Elle est le contrôle à faire avant toute donnée réelle.

La dérive est branchée. La distribution de référence n'est pas encore dans la fiche : l'écran le dit, il n'invente pas un PSI.

---

## 9. Difficultés et réponses

Le workflow de lecture de PDF servi par n8n est resté sur une ancienne adresse de modèle alors que le fichier du dépôt était à jour. Réimport et redémarrage. La leçon : le fichier versionné n'est pas l'état du volume.

Le seuil du cahier, 0,8, n'est pas le seuil du modèle. On l'a laissé dans la configuration pour que le jury puisse le changer en séance.

Des écrans en trop (catalogue de garanties, journal, liste de décisions) ont été retirés du menu pour coller aux parcours demandés.

L'e-mail d'alerte est prévu dans le workflow. Le canal effectif de la démonstration est le journal interne, tant que l'adresse n'est pas renseignée.

---

## 10. Qui a fait quoi

À compléter à l'oral avec les prénoms. Le dépôt sépare trois responsabilités :

- le modèle, les 23 variables, les fiches `v1` et `v2` ;
- la plateforme : API, base, rôles, n8n, sauvegarde, supervision ;
- l'écran et l'assistant : parcours, dépôt, pilotage, questions sourcées.

Chacun montre la planche qui correspond à sa part, et reste pour les questions des autres.

---

## 11. Ce que le jury peut vérifier

| Condition | Où |
|---|---|
| Déployable | `docker compose up`, puis l'écran |
| Utilisable | Quatre connexions, sans commande |
| Persistante | Redémarrage, les factures sont là. Scripts `backup.sh` et `restore.sh` |
| Configurable | Réglages, seuil modifié devant la salle |
| Supervisable | Supervision et `/health` |
| Maintenable | Modèles, bascule `v2` vers `v1` |
| Robuste | Lot inédit. Facture cassée : un code, un motif |
| Documentée | Ce dossier, `docs/livrables/` |

---

## 12. Fermeture

PrediCare TPA est une plateforme de contrôle, pas un classeur de notebooks.

Le gestionnaire décide. Le chiffre d'économie est celui qu'il confirme.

Questions.
