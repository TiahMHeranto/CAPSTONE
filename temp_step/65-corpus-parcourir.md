# Corpus choisi par Parcourir

## Fait

Dans Réglages, le dossier du corpus ne se tape plus. Parcourir ouvre le sélecteur du système, envoie les PDF du dossier choisi, puis lance la mise à jour de l'assistant.

## Pourquoi

L'administrateur met les documents à jour sans chemin écrit à la main et sans commande.

## Fichiers

- `frontend/src/features/admin/reglages-form.tsx`
- `frontend/src/features/admin/api.ts`
- `frontend/src/lib/api/serveur.ts`
- `backend/app/services/corpus.py`
- `backend/app/api/pilotage.py`
- `docker-compose.yml`

## Vérification

`pytest backend/tests/test_corpus.py`. Un chemin `../` est refusé. Dans Réglages, Parcourir remplace le champ texte.

Le dossier monté doit être modifiable. Recréer le conteneur API après ce changement, sinon l'écriture est refusée.

## Ensuite

Rien.
