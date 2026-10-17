# Matrice des rôles

| Rôle | Schémas | Limite |
|---|---|---|
| `prediccare` | tous | Compte de migration. Porte les clés HMAC et de chiffrement le temps du chargement. Ne sert pas l'API |
| `prediccare_app` | `app` en lecture-écriture, `clean` en lecture | N'a pas `raw` ni `labels`. N'a pas de lecture directe sur `identites.coffre`. Peut exécuter `lire_charge` et `effacer_charge` |
| `prediccare_agent` | lecture des vues `clean.dossier_*` | Aucune facture tant que `prediccare.assure_id` ou `prediccare.prestataire_id` n'est pas celui du jeton. L'administrateur passe par `prediccare_app` et voit tout le dossier. Pas d'accès à `identites`, `raw`, `labels` |
| `prediccare_bi` | lecture de `bi.volumes`, `bi.alertes_par_statut`, `bi.decisions_humaines`, `bi.distribution_scores` | Pas d'accès à `app`, `clean`, `identites`, `raw`, `labels`. Le mot de passe est `BI_DB_PASSWORD` |
| Administrateur HTTP | routes `POST /admin/reidentify` et `POST /admin/erase` | En-tête `X-Admin-Key`. Chaque appel est audité |

## Rôles HTTP

`GET /health` et `POST /auth/login` sont publics. Les autres routes exigent `Authorization: Bearer`. Le jeton porte le rôle, le pseudonyme de l'assuré et, pour un professionnel, l'identifiant d'établissement. L'en-tête `X-Admin-Key` ouvre seulement les routes administrateur.

| Route | Prestataire | Assuré | Gestionnaire | Administrateur |
|---|---|---|---|---|
| `POST /assistant` | oui | oui | oui | oui |
| `POST /invoices/validate` | oui | | oui | oui |
| `POST /invoices`, `POST /invoices/batch` | oui | | oui | |
| `GET /invoices/{id}` | ses dépôts | les siens | oui | oui |
| `GET /predictions/{id}` | | | oui | oui |
| `GET /alerts` | | | oui | oui |
| `GET /alerts/prescriptions` | | | oui | oui |
| `POST /alerts/journal` | | | | oui |
| `GET /alerts/journal` | | | oui | oui |
| `POST /invoices/{id}/decisions` | | | oui | |
| `GET /me/remboursements` | | les siens | | |
| `POST /admin/utilisateurs`, `GET /admin/utilisateurs`, `GET /admin/annuaire` | | | | oui |
| `GET /me/profil` | le sien | le sien | le sien | le sien |
| `GET /me/contrat`, `GET /me/factures`, `GET /me/ordonnances` | son établissement, ou les ordonnances d'un assuré choisi | son dossier | | |
| `GET /me/assures`, `GET /me/referentiel`, `POST /me/ordonnances` | oui, rattachement exigé | | | |
| `GET /metrics` | | | oui | oui |
| `GET /bi` | | | oui | oui |
| `GET` et `PATCH /admin/settings` | | | | oui |
| `GET /admin/drift`, `GET /admin/supervision` | | | | oui |
| `GET /read`, `GET /read/factures`, `GET /read/journal`, `GET /read/{schema}/{table}` | | | oui | oui |
| `POST /admin/reidentify`, `POST /admin/erase` | | | | clef admin |

Un assuré ne reçoit que les factures dont `assure_id` est le pseudonyme de son jeton. Un autre rôle sur la même route reçoit `403`. Sans jeton, `401`.

L'agent pose le pseudonyme de la session avant de lire :

```sql
SELECT set_config('prediccare.assure_id', '<pseudonyme>', false);
```

Sans cette valeur, les politiques de ligne ne renvoient rien.
