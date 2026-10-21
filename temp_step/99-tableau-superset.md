# 99 — Tableau de bord Superset

Le cahier demande un tableau décisionnel des volumes traités, des montants économisés et du taux de détection. Superset avait la source « PrediCare BI » et les vues du schéma `bi`, mais aucun graphique.

`dashboard/creer_tableau.py` enregistre les quatre vues, puis dix graphiques et le tableau « Pilotage PrediCare » (`/superset/dashboard/pilotage/`). Le script est relançable et s'exécute au démarrage du conteneur, après le branchement de la source. Les libellés restent en français. L'acteur d'une décision n'est pas affiché.

Les trois indicateurs du cahier viennent de `bi.volumes` : nombre de factures, somme des montants dont la dernière décision humaine est un rejet, part des factures scorées classées en alerte. Les autres graphiques reprennent l'écran Pilotage : alertes par statut, décisions par type, répartition des scores, dernières décisions. Aucune métrique d'entraînement.

Vérification : le script lit chaque graphique (1 ligne pour les chiffres, 6 tranches de scores, 3 types de décision, 7 décisions). L'écran `http://localhost:8088` affiche le tableau après connexion avec `SUPERSET_ADMIN_USERNAME`.

Fichiers : `dashboard/creer_tableau.py`, `dashboard/Dockerfile`, `dashboard/entree.sh`, `docs/livrables/03-pilotage-bi.md`.
