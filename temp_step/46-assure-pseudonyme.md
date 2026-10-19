# Dépôt d'un assuré lu sur le PDF

## Fait

Le dépôt traduit l'identifiant imprimé (`ASS-…`) en pseudonyme HMAC avant de chercher l'assuré. S'il existe, la facture est enregistrée avec ce pseudonyme. S'il n'existe ni en clair ni en pseudonyme, le rejet `REFERENCE_INCONNUE` reste.

## Pourquoi

`clean.assures` ne contient que des pseudonymes de 64 caractères. Le PDF de l'exemple `PT025/2024/00079` porte `ASS-7134E58084`, présent dans la cohorte source. Le contrôle comparait le texte imprimé tel quel et rejetait la facture.

## Fichiers

- `backend/app/services/flux.py`
- `backend/tests/test_flux.py`
- `docker-compose.yml` (la clé HMAC est aussi lue par l'API)
- `docs/05-api/contrat-donnees.md`

## Vérification

`test_assure_imprime_devient_pseudonyme` et `test_reference_inconnue` passent. Un dépôt réel avec `ASS-7134E58084` ne renvoie plus `REFERENCE_INCONNUE`. Il s'arrête ensuite sur `503 MODELE_INDISPONIBLE` tant que les poids du modèle ne sont pas dans `models/v2`. Aucune facture d'essai n'a été enregistrée.

## Ensuite

Recréer le service `api` si `PSEUDO_HMAC_KEY` n'est pas la valeur par défaut, pour que le conteneur lise la même clé que le chargement.
