# n8n

Le service n8n démarre avec la pile. Le workflow d'alerte est `workflows/alerte.json`. La fiche (déclencheur, nœuds, échec, import) est dans `docs/04-workflow/fiche-alerte.md`.

Le workflow de lecture d'un PDF de facture est `workflows/ocr.json`. Le script du nœud est `workflows/ocr.js`. La fiche est dans `docs/04-workflow/fiche-ocr.md`.

Les messages portent le score, les contributions et un lien (`facture_id`, pseudonyme). Ils ne portent ni nom, ni téléphone, ni e-mail, ni CIN.
