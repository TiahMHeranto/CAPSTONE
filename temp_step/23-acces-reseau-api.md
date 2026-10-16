# 23 — API joignable sur le réseau local

## Fait

Le port de l'API est publié sur `0.0.0.0`, donc sur toutes les interfaces de la machine. Le navigateur d'une autre machine du réseau peut appeler l'API : les origines sont acceptées. La règle de pare-feu n'a pas pu être créée depuis cette session (accès refusé). Elle reste à lancer dans un PowerShell administrateur.

## Pourquoi

Le conteneur écoutait déjà en interne, mais le poste hôte ne laissait pas forcément entrer les autres adresses du réseau.

## Fichiers

`docker-compose.yml`, `backend/app/main.py`, `backend/tests/test_health.py`, `.env.example`.

## Vérification

`pytest backend/tests/test_health.py` : une prérequête venue de `192.168.1.20` reçoit `access-control-allow-origin: *`. Depuis une autre machine : `http://<adresse-du-poste>:8000/health`.

## Ensuite

Recréer le conteneur `api` pour prendre le nouveau mapping de port : `docker compose up -d api`. Puis, en administrateur : `New-NetFirewallRule -DisplayName "PrediCare API" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000 -Profile Private,Domain`.
