# 36 — Plan des réponses SQL par outils

## Fait

Un fichier texte décrit les étapes pour reconstruire les réponses SQL après le retour à l'étape 33. Le modèle choisit entre la recherche documentaire et une requête SQL, avec garde-fou, identité prise dans le jeton, et boucle de correction.

## Pourquoi

Le pipeline précédent laissait le modèle copier un exemple d'agrégat pour une question de liste. Le plan fixe l'ordre : valider le SQL seul avant de le mélanger au RAG.

## Fichiers

`docs/05-api/assistant-sql-etapes.txt`.

## Vérification

Lecture du fichier. Aucun code d'exécution n'a été modifié.

## Ensuite

Suivre l'ordre du fichier, en commençant par les vues et le garde-fou, avant de rendre les deux outils au modèle.
