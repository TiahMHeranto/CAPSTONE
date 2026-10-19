# Fiche du workflow OCR

Le fichier importable est `n8n/workflows/ocr.json`. Il reprend la chaîne « dépôt, lecture, extraction, découpage », avec un webhook à la place d'un dossier Drive. Le modèle est Gemma 4 (`LLM_MODEL`), appelé avec la clef Google AI Studio.

## Déclencheur

`POST /webhook/ocr`, nœud **Depot PDF**. L'API l'appelle quand un professionnel ou un gestionnaire envoie un PDF à `POST /invoices/extract`. Le corps JSON porte `filename`, `mime_type` et `base64`. Un envoi multipart (champ fichier) est lu aussi. L'en-tête `X-Ocr-Key` reprend la clef admin. Sans cette clef, la réponse est `CLEF_REFUSEE` et rien n'est extrait.

Le PDF n'est pas conservé. Les exécutions ne sont pas enregistrées.

## Nœuds

1. **Regrouper fichiers** rassemble un ou plusieurs fichiers (nom, type, base64).
2. **Lire le texte** appelle `POST http://api:8000/invoices/ocr/lire`. pypdf lit le texte intégré. Sinon Tesseract (français et anglais) lit l'image. Les deux sont dans l'image API.
3. **Preparer le prompt** demande un JSON de factures : identifiants, dates, montant, lignes. Pas de nom, d'adresse, de téléphone, d'e-mail ni de CIN.
4. **Extraction modele** envoie ce texte à `LLM_BASE_URL/models/{LLM_MODEL}:generateContent`.
5. **Parser et eclater** découpe le tableau `invoices` en un item par facture.
6. **Assembler** renvoie `{factures: [...]}` au webhook.

L'écran Factures remplit le formulaire avec la première facture. S'il y en a plusieurs, le lot du gestionnaire reçoit la liste. Le dépôt reste **Déposer et scorer** (`POST /invoices`) ou **Déposer le lot**. La lecture ne score pas.

## Import

```powershell
docker compose up -d n8n
docker compose exec -u node n8n n8n import:workflow --input=/import/workflows/ocr.json
docker compose exec -u node n8n n8n update:workflow --id=S42hzUxzWj7nHPBt --active=true
docker compose restart n8n
```

Un PDF sans texte reçoit `422` `PDF_SANS_TEXTE`. Si le modèle ou n8n ne répond pas, `503` `WORKFLOW_INDISPONIBLE`.
