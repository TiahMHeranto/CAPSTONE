# Matrice des rôles

| Rôle | Schémas | Limite |
|---|---|---|
| `prediccare` | tous | Compte de migration. Porte les clés HMAC et de chiffrement le temps du chargement. Ne sert pas l'API |
| `prediccare_app` | `app` en lecture-écriture, `clean` en lecture | N'a pas `raw` ni `labels`. N'a pas de lecture directe sur `identites.coffre`. Peut exécuter `lire_charge` et `effacer_charge` |
| `prediccare_agent` | lecture de `clean.assures`, `clean.factures`, `clean.lignes_facture`, `clean.ordonnances` | Aucune ligne tant que `prediccare.assure_id` n'est pas le pseudonyme de l'assuré connecté. Pas d'accès à `identites`, `raw`, `labels` |
| `prediccare_bi` | lecture de `bi.volumes`, `bi.alertes_par_statut`, `bi.decisions_humaines`, `bi.distribution_scores` | Pas d'accès à `app`, `clean`, `identites`, `raw`, `labels`. Le mot de passe est `BI_DB_PASSWORD` |
| Administrateur HTTP | routes `POST /admin/reidentify` et `POST /admin/erase` | En-tête `X-Admin-Key`. Chaque appel est audité |

## Rôles HTTP

`GET /health` et `POST /auth/login` sont publics. Les autres routes exigent `Authorization: Bearer`. Le jeton porte le rôle et, pour l'assuré, le pseudonyme. L'en-tête `X-Admin-Key` ouvre seulement les routes administrateur.

| Route | Prestataire | Assuré | Gestionnaire | Administrateur |
|---|---|---|---|---|
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
| `GET /metrics` | | | oui | oui |
| `GET /bi` | | | oui | oui |
| `GET` et `PATCH /admin/settings` | | | | oui |
| `GET /admin/drift`, `GET /admin/supervision` | | | | oui |
| `POST /admin/reidentify`, `POST /admin/erase` | | | | clef admin |

Un assuré ne reçoit que les factures dont `assure_id` est le pseudonyme de son jeton. Un autre rôle sur la même route reçoit `403`. Sans jeton, `401`.

L'agent pose le pseudonyme de la session avant de lire :

```sql
SELECT set_config('prediccare.assure_id', '<pseudonyme>', false);
```

Sans cette valeur, les politiques de ligne ne renvoient rien.
