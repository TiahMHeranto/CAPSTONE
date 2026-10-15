# Note de pseudonymisation

## Méthode

`assure_id` du fichier source est déjà un identifiant opaque. Il reste la clé de jointure de `raw`, qui n'est pas servi.

Dans `clean` et dans le coffre, il est remplacé par un HMAC-SHA256 de cet identifiant. La clé est `PSEUDO_HMAC_KEY`, lue dans l'environnement au chargement. Le même identifiant et la même clé donnent le même pseudonyme d'un chargement à l'autre. Sans la clé, le pseudonyme ne se renverse pas.

La charge du coffre est un jeton Fernet. La clé AES est dérivée de `PII_ENCRYPTION_KEY` par SHA-256. Elle n'est pas écrite en base. L'API la possède pour la route d'administration. L'agent et n8n ne la reçoivent pas.

L'année de naissance sert seulement à calculer `tranche_age` (0-17, 18-39, 40-59, 60+) par rapport à `AGE_REFERENCE_YEAR`. La date de naissance du fichier d'identités n'est pas lue pour ce calcul.

## Classement des champs

| Classe | Champs | Où ils vivent |
|---|---|---|
| Identifiant direct | nom, prénoms, téléphone, e-mail, adresse, CIN, date de naissance, nom du souscripteur | Coffre chiffré, ou `raw` non servi pour le nom du souscripteur |
| Quasi-identifiant | année de naissance, ville, sexe, combinaison rare d'actes | L'année devient une tranche. Ville et sexe restent dans `clean` |
| Donnée de santé | type de facture, codes d'actes et de médicaments, diagnostic | `clean` pour la facture et les codes. Le diagnostic reste dans `raw` |
| Neutre | montants, dates de facture, formule, identifiants techniques | `clean` |

Le nom d'un prestataire est une raison sociale du référentiel, pas l'identité d'un assuré. Il reste dans `clean.prestataires`.

## Gestion des clés

Les trois secrets `PSEUDO_HMAC_KEY`, `PII_ENCRYPTION_KEY` et `ADMIN_API_KEY` sont des placeholders `change-me` dans `.env.example`. Les remplacer avant un environnement partagé. Changer la clé HMAC change tous les pseudonymes au chargement suivant : le coffre et `clean` sont reconstruits ensemble.

## Vérification

Au démarrage de `migrate`, un scan compare les e-mails, téléphones, CIN, noms complets et identifiants source aux colonnes servies. Une correspondance arrête le chargement. Un test vérifie qu'une charge chiffrée ne contient pas l'e-mail en clair, et que le journal d'audit ne reçoit pas le nom.
