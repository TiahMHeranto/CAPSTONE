# Spécification HTTP

FastAPI publie la spécification OpenAPI sur `GET /openapi.json` et une console sur `GET /docs`. Ce fichier fixe l'authentification et les exemples. Le détail des champs est dans `contrat-donnees.md`.

## Authentification

```http
POST /auth/login
Content-Type: application/json

{"identifiant": "gestionnaire", "mot_de_passe": "<AUTH_DEMO_PASSWORD>"}
```

Réponse `200` : `{"token": "<jeton>", "role": "gestionnaire"}`. Le jeton se passe ensuite en `Authorization: Bearer <jeton>`. Il expire au bout de huit heures.

Les identifiants créés au démarrage sont `prestataire`, `assure`, `gestionnaire` et `administrateur`. Le mot de passe est la variable `AUTH_DEMO_PASSWORD`, pris au premier passage de `migrate`. Le pseudonyme de l'assuré est `AUTH_ASSURE_ID`, une valeur de `clean.assures`, pas un nom. S'il est vide, `GET /me/remboursements` renvoie une liste vide.

Les routes `POST /admin/reidentify` et `POST /admin/erase` gardent l'en-tête `X-Admin-Key`. Cette clef ouvre aussi `GET` et `PATCH /admin/settings`.

## Exemples

Facture valide, rôle prestataire :

```http
POST /invoices
Authorization: Bearer <jeton>

{
  "facture_id": "FAC-DEMO-1",
  "type_facture": "CONSULTATION",
  "date_soin": "2024-11-11",
  "date_facture": "2024-11-12",
  "montant_total": 19000,
  "lignes": [
    {"code": "CONS-GEN", "type_ligne": "ACTE", "quantite": 1, "prix_unitaire": 19000, "montant": 19000}
  ]
}
```

Facture invalide : `422`, `valide` à faux, `rejets` avec un code et un motif. Le score n'est pas calculé. Une ligne est écrite dans `app.audit_log`.

Décision, rôle gestionnaire :

```http
POST /invoices/FAC-DEMO-1/decisions
Authorization: Bearer <jeton>

{"decision": "complement", "motif": "ordonnance manquante"}
```

Changement de seuil, sans redémarrage :

```http
PATCH /admin/settings
Authorization: Bearer <jeton>

{"alert_threshold": 0.5}
```

La facture suivante lit cette valeur. Pour revenir à la version précédente : `{"active_model_version": "v1"}`. L'audit conserve l'auteur, l'ancienne valeur, la nouvelle valeur et l'horodatage.

Tableau de bord, rôles gestionnaire et administrateur :

```http
GET /bi
Authorization: Bearer <jeton>
```

La réponse reprend `bi.volumes`, `bi.alertes_par_statut`, `bi.decisions_humaines` et `bi.distribution_scores`.

Supervision, rôle administrateur :

```http
GET /admin/supervision
Authorization: Bearer <jeton>
```

`GET /admin/drift` ne renvoie que le bloc dérive. `depasse` vaut vrai quand le PSI atteint `drift_psi_threshold` et que la version active a au moins 30 scores.
