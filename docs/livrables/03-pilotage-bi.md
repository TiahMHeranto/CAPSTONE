# Pilotage et tableau de bord BI

Le cahier demande un tableau lisible des volumes traités, des montants économisés et du taux de détection. Deux lectures existent. Elles portent les mêmes agrégats, sans labels de fraude et sans identités.

## Écran Pilotage

Adresse : `http://localhost:3000/pilotage`.

Rôles : gestionnaire et administrateur. L'API est `GET /bi`.

| Indicateur | Lecture |
|---|---|
| Volumes | Factures scorées |
| Alertes | Répartition par statut |
| Décisions | Valider, rejeter, demander un complément |
| Répartition des scores | Forme des scores servis |
| Montant économisé | Somme des montants des décisions « rejeter ». Un score sans décision humaine ne compte pas |
| Taux de détection | Part des factures scorées classées en alerte |

Un identifiant de facture déjà scorée ouvre son détail. Il n'y a pas d'export.

Tant qu'aucune décision « rejeter » n'a été enregistrée, le montant économisé vaut 0. Ce zéro est une mesure, pas un taux de fraude.

## Superset

Adresse : `http://localhost:8088`.

Le compte d'écran est `SUPERSET_ADMIN_USERNAME`. La source « PrediCare BI » lit le schéma `bi` avec le rôle `prediccare_bi`, en lecture seule. Le mot de passe de ce rôle est `BI_DB_PASSWORD`. La signature des sessions est `SUPERSET_SECRET_KEY`.

Le schéma est créé par `migrations/sql/007_bi.sql`. Il expose des agrégats et des décisions. Il n'expose pas `est_fraude`, ni le coffre d'identités, ni les noms.

Les vues servent à refaire les mêmes lectures que l'écran Pilotage (volumes, alertes, décisions, distribution) pour un public qui travaille dans Superset. Elles ne sont pas une seconde source de vérité : les deux lisent la base après le score et après la décision.

## Ce qui n'est pas un indicateur de production

Les métriques de la fiche `models/v2/metadata.json` (rappel, précision, F1, aires sous la courbe) décrivent le jeu de test de l'entraînement, 12 689 factures, partage temporel. Elles ne s'affichent pas comme des KPI d'exploitation. Le taux de détection de Pilotage est calculé sur les factures réellement scorées par l'API.
