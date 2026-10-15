# Procédure des droits

Les données du projet sont synthétiques. La procédure décrit ce que la plateforme fera le jour où elle traiterait des personnes réelles.

## Accès

La personne, ou le gestionnaire qu'elle mandate, obtient son historique via le pseudonyme. L'administrateur peut ré-identifier avec `POST /admin/reidentify` et l'en-tête `X-Admin-Key`. Le corps ne contient que le pseudonyme, 64 caractères hexadécimaux. La réponse en clair n'est pas écrite dans `app.audit_log`.

## Rectification

Une identité erronée se corrige dans la source, puis le service `migrate` reconstruit le coffre. Le pseudonyme ne change pas tant que la clé HMAC et l'identifiant source ne changent pas.

## Effacement

`POST /admin/erase`, même en-tête, supprime la charge chiffrée de cet assuré et écrit un audit `effacement`. Les factures pseudonymisées restent : elles ne portent ni nom, ni téléphone, ni CIN. La durée de conservation des identités est `retention_identites_years` dans `app.settings`, initialisée depuis `RETENTION_IDENTITES_YEARS` (5 ans).

## Opposition au score et intervention humaine

Le score ne produit pas le rejet. Un gestionnaire tranche. La route de décision viendra avec l'API métier. En attendant, aucune alerte n'est envoyée.

## Qui lit quoi

Le détail des rôles est dans `docs/05-api/matrice-roles.md`.
