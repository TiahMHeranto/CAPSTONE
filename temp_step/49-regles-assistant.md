# Règles de la page Assistant

## Fait

L'annexe A du référentiel frontend (page Assistant) est ajoutée dans `.cursor/rules/frontend-assistant.mdc`. Les règles composants, parcours et sécurité renvoient vers elle. En cas de conflit, cette annexe prime pour `/assistant`.

## Pourquoi

Le PDF mis à jour ajoute la conversation, le rendu sans symboles, les sources repliées, le flux SSE et les états de la page. Ces règles n'étaient pas dans le premier référentiel.

## Fichiers

- `.cursor/rules/frontend-assistant.mdc`
- `.cursor/rules/frontend-composants.mdc`
- `.cursor/rules/frontend-parcours.mdc`
- `.cursor/rules/frontend-securite-qualite.mdc`

## Vérification

Ouvrir un fichier sous `frontend/` : la règle « Page Assistant » est dans le contexte. Elle décrit le fil, la saisie, les sources et le contrat SSE.

## Ensuite

Construire la page quand les fondations du frontend seront posées.
