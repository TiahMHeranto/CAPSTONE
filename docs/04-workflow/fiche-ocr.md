# Fiche du workflow OCR

Le fichier importable est `n8n/workflows/ocr.json`. Le script du nœud Extraire est `n8n/workflows/ocr.js`, recopié dans le JSON. Il ne contient ni secret ni nom.

## Déclencheur

`POST /webhook/ocr`, reçu par le nœud Reception. L'API l'appelle après avoir lu le PDF, à l'URL `N8N_OCR_URL` (`http://n8n:5678/webhook/ocr` depuis le conteneur API).

Le corps est `{"texte": "..."}`. L'en-tête `X-Ocr-Key` reprend la clef admin. Un appel sans cette clef répond `401` et n'extrait rien.

Le PDF n'est pas envoyé à n8n et n'est pas enregistré. Les exécutions réussies et en erreur ne sont pas conservées.

## Nœuds

1. **Reception** attend le texte.
2. **Extraire** repère les étiquettes (`Identifiant`, `Type`, `Date de soin`, `Date de facture`, `Montant total`, `Assure`, `Prestataire`, `Ordonnance`, `Contrat`) et les lignes `code | ACTE ou MEDICAMENT | quantité | prix | montant`. Les dates `jj/mm/aaaa` deviennent `aaaa-mm-jj`. Un montant `15 000` devient `15000`.
3. **Reponse** renvoie `complet`, `champs_manquants` et `facture`.

L'API ajoute `canal_reception: pdf` et `moteur` (`pypdf` si le PDF contient du texte, `tesseract` si la page est une image). Tesseract et le français (`tesseract-ocr-fra`) sont dans l'image API. Aucun service payant.

## Entrées

La saisie du formulaire envoie `canal_reception: saisie`. L'import PDF remplit le même formulaire. Le dépôt reste `POST /invoices` : la lecture ne score pas.

## Import

```powershell
docker compose exec -u node n8n n8n import:workflow --input=/import/workflows/ocr.json
docker compose exec -u node n8n n8n list:workflow
docker compose exec -u node n8n n8n update:workflow --id=<id> --active=true
docker compose restart n8n
```

Un PDF sans ligne lisible reçoit `422` `PDF_SANS_TEXTE`. Si n8n ne répond pas, `503` `WORKFLOW_INDISPONIBLE`.
