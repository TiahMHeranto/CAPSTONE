# Superset et fins de ligne

## Fait

Le Dockerfile de Superset retire les retours chariot de `entree.sh` avant de le rendre exécutable.

## Pourquoi

Sous Windows le script arrive avec des fins CRLF. Linux lit alors `bash\r` dans le shebang et le conteneur s'arrête avec le code 127.

## Fichiers

- `dashboard/Dockerfile`

## Vérification

`docker compose build superset` puis `docker compose up -d superset`. Les journaux ne doivent plus contenir `bash\r`.

## Ensuite

Rien.
