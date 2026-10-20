# Discours de soutenance — PrediCare TPA

Support de parole calé sur les 18 diapositives de `Sujet et repartition/PrediCare TPA.pptx`. Durée visée : 12 à 15 minutes hors démo, 18 à 20 minutes avec la démo (diapositive 16). Trois voix sont prévues (Membre 1, Membre 2, Membre 3) ; les répliques sont marquées, mais une seule personne peut aussi tout porter.

Remplacer `[Membre 1]`, `[Membre 2]`, `[Membre 3]` et leurs rôles par les vrais noms avant l'oral (diapositive 1 et 17 du support).

---

## Diapositive 1 — Ouverture

**[Porteur principal]**
Bonjour à tous. Nous sommes [Membre 1], [Membre 2] et [Membre 3], et nous allons vous présenter PrediCare TPA : une plateforme qui repère les fraudes sur les factures de remboursement santé, et qui aide les assurés à s'y retrouver.

En une phrase : PrediCare lit une facture, lui donne un score de risque, explique ce score, et laisse un humain décider. Ce n'est pas un prototype isolé : c'est une application qui se lance avec une seule commande, utilisable par quatre profils différents.

## Diapositive 2 — Sommaire

Notre présentation suit cinq temps : le problème et la solution, le modèle et ses résultats, la plateforme elle-même, la valeur et la confiance qu'on peut lui accorder, et enfin une démonstration en direct.

## Diapositive 3 — Le problème

**[Membre 1 ou 2]**
Le constat de départ est simple et il fait mal : entre 8 et 15 % des remboursements sont perdus à cause de fraudes ou d'erreurs. Sur chaque 100 ariary remboursés, c'est déjà beaucoup qui part dans le mauvais sens.

En face de ça, la vérification reste largement manuelle. Des milliers de factures arrivent chaque jour, un gestionnaire ne peut pas tout relire en détail, et pendant ce temps les assurés appellent pour savoir où en est leur dossier. On a donc trois pressions en même temps : trop de risque, trop de charge de travail, trop d'attente pour l'assuré.

## Diapositive 4 — La solution

Face à ça, PrediCare TPA ne remplace pas le gestionnaire : c'est une aide à la décision, l'humain garde toujours le dernier mot. Concrètement, elle fait trois choses.

Elle repère les fraudes suspectes, en donnant à chaque facture reçue un score de risque entre 0 et 1. Elle explique pourquoi une facture est suspecte — une ordonnance périmée, un prix trop élevé — ces raisons sont affichées, pas cachées dans une boîte noire. Et elle aide à répondre aux questions sur les contrats, grâce à un assistant qui s'appuie sur les documents et cite ses sources.

## Diapositive 5 — Pour qui, et comment ça marche

La plateforme sert quatre profils : le gestionnaire, l'assuré, le professionnel de santé, et l'administrateur. Chacun arrive sur son propre tableau de bord, avec ses propres droits.

Le parcours d'une facture est toujours le même, en cinq étapes : réception de la facture, calcul d'un score entre 0 et 1, comparaison de ce score au seuil d'alerte, alerte expliquée si le seuil est dépassé, et enfin remontée dans le tableau de bord. C'est ce même fil que vous verrez tourner dans la démonstration.

## Diapositive 6 — Nos données

**[Membre 1]**
Parlons maintenant du modèle. Nous avons travaillé sur 84 593 factures, avec un taux de fraude de 8,69 %, et 23 indicateurs par facture — montant, acte, ordonnance, historique, et ainsi de suite.

Ce modèle a été testé sur 12 689 factures récentes, jamais vues pendant l'entraînement, pour éviter de se mentir sur la performance. Et c'est important de le préciser : ce sont des données synthétiques. Aucune donnée de santé réelle n'a été utilisée.

## Diapositive 7 — Repérer la fraude, concrètement

Pour rendre ça concret, prenons deux exemples. Une facture normale, une consultation générale classique, reçoit un score de 0,1 : elle est acceptée sans friction.

Une facture suspecte, elle, peut cumuler plusieurs signaux : une ordonnance périmée, un acte non prescrit, un prix trop élevé. Son score grimpe à 0,9, une alerte est envoyée, et les raisons possibles sont listées : ordonnance périmée, acte non prescrit, prix trop élevé, quantités excessives. Le gestionnaire ne reçoit jamais juste un chiffre : il reçoit un chiffre et une explication.

## Diapositive 8 — Nos résultats

Avec le réglage recommandé, le modèle repère 94,7 % des fraudes, et 87,4 % des alertes envoyées sont justes. Le seuil d'alerte retenu est 0,543, et avec ce réglage, 9,3 % des factures déclenchent une alerte.

Je le redis, parce que c'est le cœur de notre démarche éthique : le gestionnaire décide toujours. Le modèle aide, il ne remplace personne.

## Diapositive 9 — Trois réglages au choix

Et justement, ce seuil n'est pas figé dans le code : c'est un réglage. Nous proposons trois profils. Le réglage prudent, v1, repère 92,5 % des fraudes avec 92,9 % d'alertes justes, pour 8,5 % de factures alertées. Le réglage recommandé, v2, celui que nous avons présenté, repère 94,7 % des fraudes avec 87,4 % d'alertes justes. Et le réglage maximal, v3, va chercher jusqu'à 98 % des fraudes, mais au prix d'alertes justes qui tombent autour de 53 %, pour près de 15,7 % des factures alertées.

L'idée à retenir : plus on veut attraper de fraudes, plus on génère d'alertes à vérifier. Et ce curseur se change dans l'écran d'administration, sans retoucher le code et sans réentraîner le modèle.

## Diapositive 10 — Forces et limites

Nous sommes très transparents sur ce que le modèle fait bien, et moins bien. Il repère à 100 % les cas de surfacturation, les actes non prescrits, les ordonnances périmées et les quantités excessives dans notre jeu de test.

En revanche, les doublons, certaines spécialités médicales, et les incohérences de profil restent plus difficiles à détecter. Et nous avons deux engagements fermes : aucune donnée sensible n'entre dans le modèle, et l'identifiant du prestataire est exclu des variables — il n'y a pas de liste noire de professionnels de santé.

## Diapositive 11 — L'assistant intelligent

**[Membre 3]**
Au-delà du score, nous avons aussi construit un assistant conversationnel. Un assuré ou un gestionnaire peut poser une question du type « mon acte est-il couvert ? », et l'assistant répond en citant sa source, par exemple « Contrat Santé, page 12 ».

Cet assistant a quatre qualités : ses réponses sont fondées sur les documents, pas inventées ; les sources sont citées avec la page exacte ; il reconnaît ses limites quand il ne sait pas ; et les dossiers restent isolés selon les droits de chacun — un assuré ne voit jamais le dossier d'un autre.

## Diapositive 12 — Une plateforme prête à l'emploi

Tout ce que nous venons de décrire n'est pas une maquette : c'est une plateforme qui tourne. L'interface propose un tableau de bord, un écran Factures, un écran Alertes, un journal d'audit, et des paramètres.

On y voit en direct les factures traitées, les alertes en cours, l'état du système, la version du modèle active parmi v1 prudent, v2 recommandé et v3 maximal, et le seuil d'alerte actuel, 0,543. Tout ça avec un accès différencié par profil utilisateur, le refus propre des factures invalides, une politique claire de conservation des données, et des guides fournis pour l'utiliser et l'exploiter.

## Diapositive 13 — Si ça ne marche pas

**[Membre 2]**
Une plateforme industrielle doit aussi prévoir ses pannes. Si l'API est indisponible, on regarde l'état du système et les journaux. Si la base de données est inaccessible, on vérifie sans jamais supprimer de données. Si l'assistant ne répond pas, on vérifie les documents sources. Et si une alerte attendue n'arrive pas, on la teste avec un cas fictif.

Avant chaque mise à jour, trois réflexes systématiques : sauvegarde, tests, et un retour arrière déjà prévu. Rien n'est irréversible.

## Diapositive 14 — Ce que ça coûte et ce que ça rapporte

Parlons chiffres, en ariary, à titre indicatif. Côté coûts : l'infrastructure revient à environ 1,75 million d'ariary par mois, soit environ 43 millions d'ariary sur 24 mois. Une fausse alerte, elle, coûte environ 2 500 ariary en temps humain pour la vérifier.

Côté bénéfices : nous estimons l'enveloppe de fraude totale à environ 1,1 milliard d'ariary, et avec le réglage v2, environ 1,04 milliard d'ariary de fraudes sont interceptées. En retirant le coût des fausses alertes et de l'infrastructure, environ 45 millions d'ariary, le gain net estimé est d'environ 1 milliard d'ariary. Ce sont des estimations indicatives, mais l'ordre de grandeur parle de lui-même.

## Diapositive 15 — Confiance et responsabilité

Quatre piliers soutiennent cette plateforme. La vie privée : des données synthétiques, et ni nom ni adresse dans le modèle. L'aide à la décision : un humain décide toujours, jamais la machine seule. L'équité : pas de variables sensibles, et un suivi de la performance par type de fraude pour éviter les biais cachés. Et un cadre responsable, où les règles et les risques sont documentés, pas juste promis à l'oral.

## Diapositive 16 — Démo en direct

**[Porteur principal]**
Nous allons maintenant vous montrer tout ça en direct, en six temps : le dépôt d'une facture et son score, l'alerte côté gestionnaire, une question posée à l'assistant avec sa source, deux comptes avec deux dossiers bien isolés l'un de l'autre, le tableau de bord, et enfin l'état du système.

*(Basculer vers la démo : dépôt/scan d'une facture, écran Alertes côté gestionnaire, question à l'assistant, connexion successive avec deux comptes assuré différents, écran Pilotage, écran `/health` ou page Supervision.)*

## Diapositive 17 — L'équipe et conclusion

**[Tous]**
Pour conclure : PrediCare TPA repère les fraudes, explique ses scores, répond aux questions des assurés, et reste pilotable par un humain à chaque étape — du seuil d'alerte jusqu'à la décision finale. C'est une plateforme complète, déployable, documentée, et prête à être utilisée.

Nous sommes [Membre 1] [rôle], [Membre 2] [rôle] et [Membre 3] [rôle]. Merci de votre attention, nous sommes à votre disposition pour vos questions.

---

## Notes de passation (hors diapositives, pour anticiper les questions du jury)

- **« Le seuil 0,543 est-il figé dans le code ? »** — Non. Il est lu dans `app.settings` et modifiable depuis l'écran Paramètres (`PATCH /admin/settings`), sans redémarrage ni retour au code. Le changement est appliqué dès la facture suivante, et une ligne d'audit garde l'ancienne valeur, la nouvelle, l'auteur et l'heure.
- **« Que se passe-t-il si le fichier de modèle manque ? »** — La plateforme refuse la facture avec un code clair (`503 MODELE_INDISPONIBLE`), jamais une erreur 500 silencieuse. Rien n'est enregistré dans ce cas.
- **« Les données sont-elles réelles ? »** — Non, synthétiques, précisément pour écarter tout risque de donnée de santé réelle (diapositive 6 et 15).
- **« Le modèle peut-il tourner en arrière si la v2 déçoit ? »** — Oui, retour à v1 sans redémarrage, depuis l'écran Modèles.
- **« Comment la plateforme survit-elle à un redémarrage ? »** — Les données sont persistées dans PostgreSQL, avec sauvegarde et restauration scriptées (`db/backup/backup.sh`, `db/backup/restore.sh`), démontrées dans `docs/06-exploitation/`.
