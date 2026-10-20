# 78 — Versions corrigées pour pip-audit

## Fait

`pip-audit` échouait sur trois paquets épinglés dans `backend/requirements.txt` (72 CVE). Les versions ont été relevées au minimum qui ferme chaque alerte :

- `python-multipart` 0.0.20 → 0.0.32 (le correctif le plus haut demandé était 0.0.31)
- `pypdf` 5.1.0 → 6.21.1 (le correctif le plus haut demandé était 6.19.0)
- `pillow` 11.1.0 → 12.3.0

## Pourquoi

La CI refuse le job dès qu’une vulnérabilité connue reste dans les dépendances directes. Ces trois versions sont celles indiquées comme correctifs par l’audit.

L’API utilisée (`PdfReader`, `extract_text`, image PIL via pypdfium2 et pytesseract) ne change pas.

## Fichiers

- `backend/requirements.txt`

## Vérifier

Relancer le job GitHub Actions, ou en local :

```text
pip install -r backend/requirements.txt
pip-audit -r backend/requirements.txt
```

Le second doit se terminer sans vulnérabilité sur ces trois paquets.

## Ensuite

Rien de prévu sur cet audit. Si une nouvelle CVE apparaît, relever à nouveau l’épingle plutôt que d’ignorer l’alerte.
