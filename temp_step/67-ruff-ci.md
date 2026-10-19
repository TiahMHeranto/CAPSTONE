# Contrôle de style

## Fait

Les imports du corpus sont rangés et la ligne trop longue est coupée. `ruff check` et `ruff format --check` passent sur `backend` et `migrations`, comme le job `test` de la CI.

## Pourquoi

Le job `test` s'arrêtait sur trois erreurs ruff. Le job `image` passait déjà.

## Fichiers

- `backend/app/api/pilotage.py`
- `backend/app/services/corpus.py`
- `backend/tests/test_corpus.py`
- fichiers déjà présents que le formateur ruff 0.8.4 réécrivait

## Vérification

`ruff check backend migrations` et `ruff format --check backend migrations`.

## Ensuite

Rien.
