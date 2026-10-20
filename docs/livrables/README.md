# Livrables PrediCare TPA

Dossier lu avant la soutenance. Il reprend les pièces écrites demandées par le cahier des charges (section 6), dans l'état de la plateforme.

| Pièce du cahier | Fichier |
|---|---|
| Guide utilisateur, prise en main par rôle | [01-guide-utilisateur.md](01-guide-utilisateur.md) |
| Guide d'exploitation : installation, sauvegarde, supervision, modèle, incidents | [02-guide-exploitation.md](02-guide-exploitation.md) |
| Tableau de bord BI documenté | [03-pilotage-bi.md](03-pilotage-bi.md) |
| Analyse TCO et ROI, cache sémantique inclus | [04-finops-tco-roi.md](04-finops-tco-roi.md) |
| Conformité RGPD, grille EU AI Act, audit d'équité | [05-conformite-rgpd-ai-act-equite.md](05-conformite-rgpd-ai-act-equite.md) |
| Spécification des mécanismes de sécurité | [06-specification-securite.md](06-specification-securite.md) |
| Support du grand oral | [07-support-soutenance.md](07-support-soutenance.md) |

Chaque fichier a aussi un PDF du même nom, pour le dossier imprimé. `python docs/livrables/vers_pdf.py` les régénère.

Le code, les Dockerfiles, `docker-compose.yml`, les tests et l'architecture de démarrage restent dans le `README.md` à la racine. Les workflows n8n sont dans `n8n/workflows/`.

Les montants du dossier FinOps qui ne viennent pas d'un écran ou d'une fiche modèle sont marqués **hypothèse**. Le montant réellement économisé est celui des rejets confirmés par un gestionnaire, affiché dans Pilotage.
