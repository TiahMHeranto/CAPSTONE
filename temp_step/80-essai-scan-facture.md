# Essai du scan de facture

## Fait

Le workflow OCR actif dans n8n pointait encore vers l'ancien service local. Il a été réimporté depuis `n8n/workflows/ocr.json`, réactivé, puis n8n a été redémarré. Un PDF de facture étiquetée a été envoyé à `POST /invoices/extract`, puis scanné depuis l'écran Factures.

## Résultat

La lecture répond 200, moteur `api`. Le montant 15000 et la ligne ACC-CESAR (quantité 2, prix 7500) remplissent le formulaire. L'identifiant retenu est le nom du fichier, pas `FAC-OCR-1`. Le type, les dates et l'assuré lus sur le PDF ne sont pas repris. Le formulaire garde alors ses valeurs déjà présentes.

## Pourquoi

Le texte du PDF est bien lu. Le secours du workflow ne reconnaît une étiquette que si elle est seule sur sa ligne. Ici elles sont de la forme `Identifiant: FAC-OCR-1`.

## Fichiers

Aucun fichier de code. Le workflow chargé dans le volume n8n a été remplacé par celui du dépôt.

## Vérification

Compte gestionnaire, écran Factures, bouton Scanner la facture. Montant 15000, code ACC-CESAR.

## Ensuite

Reprendre les étiquettes `Libellé: valeur` dans le secours du workflow, pour que type, dates et assuré suivent le montant.
