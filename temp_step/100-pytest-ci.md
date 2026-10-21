# 100 — Pytest aligné sur la CI

La GitHub Action (`pytest`, puis `ruff check` et `ruff format --check` sur `backend` et `migrations`) échouait en local.

`test_login` plantait : la requête de connexion lit six colonnes (`identifiant`, hash, rôle, assuré, actif, prestataire) et le double du test n'en renvoyait que quatre, dans l'ancien ordre. Le double renvoie maintenant la ligne complète, avec l'identifiant en première colonne.

Huit lignes dépassaient 100 caractères, et cinq fichiers n'étaient pas au format ruff. Les signatures et les lectures de champs ont été coupées, puis `ruff format` a réaligné `invoices.py` et `ocr.py`.

Vérification : `python -m pytest -q` → 172 passés. `ruff check backend migrations` et `ruff format --check backend migrations` passent. L'hôte est en Python 3.14 ; la CI utilise 3.12. Le job image Docker n'a pas été relancé.
