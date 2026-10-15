# 01 — Règle de journal

## Fait

Ajout de la règle Cursor `.cursor/rules/journal-temp-step.mdc`, appliquée à chaque session. Elle impose d'écrire un fichier Markdown dans `temp_step/` à la fin de chaque étape de réalisation.

## Pourquoi

Garder une trace lisible de ce qui est construit, avant d'enchaîner les étapes du socle M2.

## Vérifier

Le fichier de règle est présent et `alwaysApply` vaut `true`.

## Ensuite

Socle technique : Docker, PostgreSQL + pgvector, API `/health`, migrations, chargement `raw`, modèle simulé.
