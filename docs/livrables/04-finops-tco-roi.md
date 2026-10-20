# Analyse TCO et ROI

Le cahier demande une modélisation du coût complet et un retour comparé aux fraudes évitées, avec le cache sémantique dans le coût. Les lignes marquées **mesure** viennent d'une fiche ou d'un écran. Les lignes marquées **hypothèse** sont un scénario pédagogique : elles ne sont pas une facture cloud ni une économie constatée.

## Périmètre

Une instance unique, sans GPU. Le score XGBoost tourne sur le processeur de l'API. Le modèle de langage (lecture de PDF et assistant) est appelé par API, pas hébergé dans la pile. La base vectorielle est PostgreSQL avec pgvector, le même serveur que les factures. Une base vectorielle séparée n'est pas retenue : elle ajouterait un service à sauvegarder pour un corpus de contrats qui tient dans la base déjà sauvegardée.

Le jeu synthétique compte 84 593 factures sur 24 mois, soit environ 42 300 factures par an. Ce volume sert de base au scénario.

## Coût annuel d'exploitation

Hypothèse de change, pour ramener l'infrastructure en ariary : 1 EUR = 5 000 MGA. Ce n'est pas un cours.

| Poste | Base | EUR / an | Nature |
|---|---|---|---|
| Machine 4 vCPU, 16 Go (écran, API, n8n, base) | 60 EUR / mois | 720 | hypothèse, offre publique |
| Disque de sauvegarde | 5 EUR / mois | 60 | hypothèse |
| Nom et certificat | forfait | 20 | hypothèse |
| Score XGBoost | processeur déjà dans la machine | 0 | mesure : pas d'appel externe |
| Lecture de PDF | 20 scans / jour ouvré, 250 jours, 0,003 EUR l'appel | 15 | hypothèse de prix d'appel |
| Assistant sans cache | 80 questions / jour ouvré, 0,004 EUR l'appel | 80 | hypothèse |
| Revue humaine | voir plus bas | — | hypothèse de temps |

Total infrastructure et jetons, avant revue humaine : **895 EUR / an**, soit **4,5 millions MGA** au change hypothétique.

Le cache sémantique de l'assistant reprend une question proche déjà répondue et n'appelle pas le modèle. Hypothèse de taux de réutilisation : 40 % des questions. Le poste assistant passe de 80 EUR à 48 EUR. Le total passe à **863 EUR / an**. L'écart, 32 EUR, est le gain du cache dans ce scénario. Il est volontairement petit devant le coût de la revue : le cache protège la facture de jetons, il ne remplace pas le gestionnaire.

La lecture de PDF n'est pas mise en cache : deux fichiers différents ne partagent pas une réponse.

## Revue humaine, poste principal

Sur le jeu de test de `v2` (mesure, fiche du 16 octobre 2026) : 1 180 alertes pour 12 689 factures, soit 9,3 %. Appliqué au volume annuel du scénario, 42 300 factures donnent environ 3 930 alertes.

Hypothèse : 4 minutes par alerte, coût chargé 8 000 MGA de l'heure.

3 930 × (4/60) × 8 000 ≈ **2,1 millions MGA / an** de revue.

Ce poste domine l'infrastructure. Baisser le seuil augmente le rappel et le nombre d'alertes. Le relever fait l'inverse. Le seuil de production se règle dans l'écran, sans réentraîner.

## Retour

La plateforme ne compte comme économie que le montant des décisions « rejeter ». C'est la mesure de Pilotage. Au moment de la rédaction, cette somme vaut 0 s'il n'y a pas encore de rejet confirmé. On ne la remplace pas par le taux de fraude cité dans le cahier (8 % à 15 %), qui décrit le secteur, pas ce jeu.

### Scénario illustratif

Hypothèses, toutes remplaçables :

- 3 930 alertes par an, calées sur le taux mesuré de 9,3 % ;
- précision de test de `v2` : 0,874, soit environ 3 430 alertes qui correspondent au label sur ce jeu ;
- le gestionnaire confirme la moitié de ces alertes ;
- montant moyen d'une facture rejetée : 80 000 MGA (exemple, pas une moyenne extraite).

Économie illustrée : 3 430 × 0,5 × 80 000 ≈ **137 millions MGA / an**.

Coût illustré : infrastructure 4,5 millions MGA + revue 2,1 millions MGA ≈ **6,6 millions MGA / an**.

Retour illustré : environ 130 millions MGA, soit un rapport de l'ordre de 20 pour 1 dans ce seul jeu d'hypothèses.

### Sensibilité

| Confirmation humaine | Montant moyen rejeté | Économie | Rapport sur 6,6 M MGA |
|---|---|---|---|
| 50 % | 80 000 MGA | 137 M MGA | ~20 |
| 20 % | 80 000 MGA | 55 M MGA | ~8 |
| 20 % | 20 000 MGA | 14 M MGA | ~2 |
| 10 % | 20 000 MGA | 7 M MGA | ~1 |

Le retour reste positif dans ces quatre cases, et il s'effondre si les rejets confirmés sont rares ou de faible montant. La décision humaine est donc le vrai levier, pas le prix du jeton.

## Ce que le cache change, et ce qu'il ne change pas

| | Sans cache | Avec cache à 40 % |
|---|---|---|
| Assistant | 80 EUR | 48 EUR |
| Total infra et jetons | 895 EUR | 863 EUR |
| Part du cache dans le coût complet (infra + revue) | — | moins de 1 % |

Le cache est exigé et il est en place. Sur ce volume, il ne fait pas le retour. Le retour vient des rejets confirmés. Le suivi honnête est l'indicateur de Pilotage, pas le tableau ci-dessus.

## Mesures du modèle utilisées ici

Fiche `models/v2/metadata.json`, jeu de test temporel, 12 689 factures.

| Indicateur | v2 | v1 |
|---|---|---|
| Rappel | 0,947 | 0,925 |
| Précision | 0,874 | 0,929 |
| F1 | 0,909 | 0,927 |
| Part d'alertes | 9,3 % | 8,5 % |
| Seuil de la fiche | 0,543 | 0,716 |

`v2` est la version active parce que le rappel cible de son entraînement est plus haut (0,95 contre 0,92). Le seuil d'alerte servi aux gestionnaires reste celui des réglages.
