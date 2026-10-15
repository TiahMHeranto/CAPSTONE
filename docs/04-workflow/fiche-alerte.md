# Fiche du workflow d'alerte

Le fichier importable est `n8n/workflows/alerte.json`. Il ne contient ni secret, ni nom, ni CIN.

## Déclencheur

`POST /webhook/alerte`, reçu par le nœud Reception. L'API l'appelle quand la classe est `alerte`, à l'URL enregistrée dans `n8n_webhook_url`. Depuis le conteneur API, cette URL est `http://n8n:5678/webhook/alerte`.

Le corps porte `facture_id`, le pseudonyme `assure_id` s'il est connu, le score, la version et au plus cinq contributions. L'en-tête `X-Alert-Key` reprend la clef admin. Un appel sans cette clef est ignoré.

## Nœuds

1. **Lire reglages** lit `GET http://api:8000/admin/settings`. Le seuil et les canaux viennent de `app.settings`, pas du corps du webhook.
2. **Preparer** construit le message : score, seuil, version, contributions, lien. Le lien est `{APP_PUBLIC_URL}/invoices/{facture_id}` et, si le pseudonyme est présent, `?assure={pseudonyme}`.
3. **Sous le seuil** arrête le flux quand le score est inférieur au seuil qui vient d'être lu. Changer le seuil en base change donc le message suivant, sans redéployer n8n.
4. **Repartir canaux** ouvre une branche par canal coché : `slack`, `email`, `webhook`.
5. **Envoyer Slack** poste `{text: message}` vers `SLACK_WEBHOOK_URL`. **Envoyer email** poste le même JSON vers `EMAIL_WEBHOOK_URL`.
6. **Journal** écrit chaque envoi dans `app.alertes` via `POST /alerts/journal`.

Le canal `webhook` est le journal lui-même : l'alerte est reçue même sans Slack ni e-mail.

## Échec

Les appels Slack, e-mail, réglages et journal ont trois tentatives, espacées d'une seconde. Après trois échecs d'envoi, une ligne `statut=echec` et `tentative=3` est écrite. C'est la file d'erreurs, lue par `GET /alerts/journal?statut=echec`.

Une destination vide (canal coché, URL absente) est journalisée tout de suite en échec, sans appel réseau.

## Import

```powershell
docker compose up -d n8n
docker compose exec -u node n8n n8n import:workflow --input=/import/workflows/alerte.json
docker compose exec -u node n8n n8n list:workflow
docker compose exec -u node n8n n8n update:workflow --id=<id> --active=true
docker compose restart n8n
```

Puis, en administrateur :

```json
PATCH /admin/settings
{"n8n_webhook_url": "http://n8n:5678/webhook/alerte"}
```

`SLACK_WEBHOOK_URL` et `EMAIL_WEBHOOK_URL` restent vides tant que ces canaux ne sont pas branchés. Les cocher sans URL produit une ligne d'échec, pas un message envoyé.
