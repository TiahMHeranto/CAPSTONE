# Migration et adresse de compte

## Fait

Le scan des données personnelles ignore `app.utilisateurs.email`. Les autres colonnes `email` des schémas `clean` et `app` restent interdites.

## Pourquoi

La migration 017 ajoute l'adresse de connexion. Le bootstrap s'arrêtait ensuite sur `scan pii: app.utilisateurs.email` et le service `migrate` sortait en code 1. Cette adresse sert à se connecter. Ce n'est pas une colonne d'identité d'assuré.

## Fichiers

- `backend/app/privacy/scan.py`
- `backend/tests/test_privacy.py`

## Vérification

Relancer `docker compose up -d --build migrate`, puis l'API et l'écran. Le journal ne doit plus afficher `scan pii`.

## Ensuite

Rien.
