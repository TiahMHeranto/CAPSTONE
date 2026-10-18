# Contrat de données

L'API ne reçoit ni nom, ni CIN, ni téléphone. L'assuré est un pseudonyme. Les labels (`est_fraude`, `type_fraude`, `detail_fraude`, `est_suspect`) et les colonnes de décision (`statut`, `motif_rejet`, `montant_pris_en_charge`, `reste_a_charge`, `date_traitement`) ne sont pas des variables du score.

La spécification exécutable est `GET /openapi.json`. L'interface est `GET /docs`.

## Entrée d'une facture

`POST /invoices` et chaque élément de `POST /invoices/batch`.

| Champ | Règle |
|---|---|
| `facture_id` | texte, 1 à 64 caractères, lettres, chiffres, `.`, `_`, `-` |
| `type_facture` | texte |
| `date_soin`, `date_facture` | dates, soin puis facture |
| `date_reception` | optionnelle, après la date de facture |
| `montant_total` | entier, zéro ou positif, égal à la somme des lignes |
| `devise` | `MGA` |
| `prestataire_id`, `assure_id`, `contrat_id` | optionnels. S'ils sont fournis, ils doivent exister dans `clean` ou `app` |
| `canal_reception`, `mode_reglement` | optionnels |
| `lignes` | au moins une. `type_ligne` vaut `ACTE` ou `MEDICAMENT`. Le code est dans le référentiel. Quantité positive, montants zéro ou positifs |

Le lot contient de 1 à 50 factures. Chaque facture a son propre résultat. Le code HTTP du lot reste 200. `statut_http` sur chaque élément dit 200, 422, 409 ou 503.

## Sortie d'une prédiction

Facture valide :

```json
{
  "facture_id": "FAC-00000001",
  "valide": true,
  "rejets": [],
  "notifie": false,
  "prediction": {
    "facture_id": "FAC-00000001",
    "score": 0.42,
    "classe": "normale",
    "model_version": "v2",
    "explications": [
      {"variable": "montant_total", "contribution": 0.12, "libelle": "Montant total de la facture"}
    ]
  }
}
```

`classe` vaut `alerte` quand le score atteint le seuil lu dans `app.settings` au moment de l'appel. `model_version` est la version active, `v2` par défaut. Sans le fichier de poids, la réponse est `503` et la facture n'est pas enregistrée. `notifie` vaut vrai seulement si la classe est `alerte`, qu'une URL http ou https est configurée, et que l'appel webhook a répondu.

Le corps envoyé à n8n ajoute `assure_id` (pseudonyme, ou chaîne vide). Le workflow journalise ensuite chaque canal via `POST /alerts/journal`. `GET /alerts/journal?statut=echec` est la file d'erreurs.

`GET /predictions/{facture_id}` renvoie le même score, la version et les contributions. `GET /invoices/{facture_id}` renvoie le statut, le montant, le score et la dernière décision, sans le détail des contributions.

## Décision

`POST /invoices/{facture_id}/decisions`

```json
{"decision": "valider", "motif": "pieces conformes"}
```

`decision` vaut `valider`, `rejeter` ou `complement`. Le motif est conservé dans `app.decisions`. L'audit n'en garde que le type de décision.

## Réglages

`PATCH /admin/settings` accepte une ou plusieurs clés : `alert_threshold` (nombre de 0 à 1), `notification_channels` (`slack`, `email`, `webhook`), `n8n_webhook_url` (vide, ou URL http/https), `active_model_version`, `drift_psi_threshold` (nombre de 0 à 5). Chaque changement est audité avec l'ancienne et la nouvelle valeur.

`GET /admin/drift` compare la distribution des scores de la version active à `distribution_reference` dans la fiche du modèle. `GET /admin/supervision` ajoute le volume, la latence et les erreurs. Le plan est dans `docs/06-exploitation/supervision.md`.

## Vues pour le tableau de bord

`GET /bi`, rôles gestionnaire et administrateur, relit quatre vues. Le compte `prediccare_bi` peut les lire directement. Elles ne contiennent ni `est_fraude`, ni les colonnes de `identites_pii.csv`, ni le motif libre de la décision.

| Vue | Contenu |
|---|---|
| `bi.volumes` | nombre de factures, prédictions, alertes modèle, scores normaux, notifications, décisions, rejets de validation |
| `bi.alertes_par_statut` | notifications groupées par canal et par statut (`envoye`, `echec`) |
| `bi.decisions_humaines` | décision du gestionnaire, acteur, horodatage, score et classe associés |
| `bi.distribution_scores` | effectif par version de modèle et par tranche de score |

Une ligne `alerte` dans ces vues est un signal. La sanction, s'il y en a une, est la décision humaine `valider`, `rejeter` ou `complement`.

## Codes d'erreur

Le corps d'un rejet métier est `422` avec `rejets: [{code, motif}]`, ou un objet `{code, motif}` pour l'authentification et les conflits. Aucun de ces cas ne répond `500`.

| Code | Situation |
|---|---|
| `TYPE_INVALIDE` | type ou format refusé par le schéma |
| `MONTANT_NEGATIF`, `MONTANT_LIGNES`, `DEVISE_INVALIDE` | montant ou devise |
| `DATES_INCOHERENTES`, `LIGNES_ABSENTES`, `TYPE_LIGNE`, `CODE_INCONNU` | contenu de la facture |
| `REFERENCE_INCONNUE` | prestataire, assuré ou contrat absent |
| `CHAMP_OBLIGATOIRE` | champ vide |
| `DOUBLON` | `facture_id` déjà déposé |
| `NON_AUTORISE` | jeton absent ou invalide |
| `TROP_DE_REQUETES` | limite de débit atteinte sur le login ou l'admin |
| `ROLE_REFUSE` | rôle interdit sur la route |
| `IDENTIFIANTS_INVALIDES` | login refusé |
| `FACTURE_INCONNUE`, `PREDICTION_ABSENTE` | lecture impossible |
| `REGLAGE_INVALIDE`, `REGLAGE_ABSENT` | configuration |
| `MODELE_INDISPONIBLE` | version active sans poids utilisable |
| `BASE_INDISPONIBLE` | base injoignable |
