# 89 — Intégration du modèle v3 (côté plateforme)

## Ce qui a été fait

Le membre 1 a déposé une mise à jour dans `M1_files/predicare-tpa` : une troisième fiche de modèle, `v3` (réglage « maximal »), en plus des fiches `v1` et `v2` déjà connues de la plateforme. Vérification faite : `v3` a exactement les mêmes 23 variables, le même algorithme XGBoost et le même schéma d'entrée que `v1`/`v2` (confirmé par diff binaire : `model.joblib` de `v1` et `v2` identiques entre `M1_files` et le dépôt, seule la date/le `mlflow_run_id` changent). Seul le seuil de rappel visé à l'entraînement diffère :

| Version | Seuil de rappel (`seuil_alerte`) | Rappel test | Précision test | % alertes |
|---|---|---|---|---|
| v1 — prudent | 0,7156 | 92,5 % | 92,9 % | 8,5 % |
| v2 — recommandé (actif) | 0,5429 | 94,7 % | 87,4 % | 9,3 % |
| v3 — maximal | 0,1457 | 98,0 % | 53,4 % | 15,7 % |

Intégré côté plateforme (membre 3 / M3) :

1. **Registre.** Copie de `M1_files/predicare-tpa/models/v3/` vers `models/v3/` à la racine du dépôt (le registre `backend/app/services/registry.py` découvre les versions dynamiquement en scannant `models/`, aucun code à changer pour l'inférence elle-même).
2. **Backend.** Docstring de `registry.py` mise à jour (v1/v2/v3). `backend/tests/test_registry.py` : l'assertion fixe `{"v1", "v2"}` est devenue `{"v1", "v2", "v3"}`, avec un contrôle que le seuil de `v3` < `v2` < `v1`.
3. **Frontend.** `frontend/src/app/modeles/page.tsx` propose maintenant `v1`, `v2` et `v3` ; libellés ajoutés dans `frontend/src/i18n/fr.json` (`admin.modeleV1Label` = « v1 — Prudent », `admin.modeleV2Label` = « v2 — Recommandé », `admin.modeleV3Label` = « v3 — Maximal »), cohérents avec le support de soutenance (diapositive 9).
4. **Documentation.** `README.md` (section Registre des modèles), `STRUCTURE_PROJET.txt` et `RESUME_MEMBRE_2.md` mentionnent désormais les trois versions livrées.

La version active au démarrage reste `v2` (`app.settings.active_model_version`), inchangée : rien ne bascule automatiquement vers `v3`, le gestionnaire/administrateur choisit depuis l'écran Modèles (`PATCH /admin/settings`), sans redémarrage.

## Pourquoi

Respecter la condition « configurable » du CDC : le seuil et la version active se changent depuis l'écran admin, pas dans le code. L'arrivée de `v3` est une nouvelle option de réglage (plus de rappel, moins de précision), pas un remplacement de `v2`.

## Fichiers touchés

- `models/v3/` (nouveau, copié depuis `M1_files/predicare-tpa/models/v3/`)
- `backend/app/services/registry.py`
- `backend/tests/test_registry.py`
- `frontend/src/app/modeles/page.tsx`
- `frontend/src/i18n/fr.json`
- `README.md`, `STRUCTURE_PROJET.txt`, `RESUME_MEMBRE_2.md`

## Comment vérifier

```bash
cd backend
python -m pytest tests/test_registry.py tests/test_inference.py -q
```

9 tests passent. Suite complète : `python -m pytest -q` → 161 passent, 1 échoue (`tests/test_flux.py::test_login`), échec pré-existant et confirmé indépendant de ce changement (reproduit identique avec `git stash` sur l'état précédent, `IndexError` dans `app/api/login.py` sur une ligne simulée à 4 colonnes au lieu de 6 dans le test).

Dans l'interface, l'écran Modèles (profil administrateur) liste désormais « v1 — Prudent », « v2 — Recommandé », « v3 — Maximal ».

## Ce qui reste

- Le test `test_flux.py::test_login` est cassé indépendamment de ce travail ; à signaler/corriger séparément (fixture `Base.execute` ne renvoie pas assez de colonnes).
- `models/v3/metadata.json` n'a pas de clé `distribution_reference` (comme `v1`/`v2`) : la dérive reste `reference_absente` pour cette version tant que le membre 1 ne la dépose pas.
- Pas de nouvelle route API pour exposer le rappel/précision de chaque fiche au frontend : l'écran Modèles reste une simple bascule, sans les métriques en direct (amélioration possible via `ModelVersionCard`, cf. `frontend-composants.mdc`).
- Les autres fichiers déposés dans `M1_files` (notebooks, `reports/`, scripts `ml/dashboard_models/`, `src/explain.py`, `src/fairness.py`) sont des livrables d'entraînement/exploration du membre 1 ; non repris ici car hors périmètre plateforme (M3).
