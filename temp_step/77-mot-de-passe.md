# Changement de mot de passe

## Fait

Chaque compte connecté change son mot de passe depuis Profil. Le formulaire reste replié : on l'ouvre avec « Modifier le mot de passe ». L'API exige le mot actuel, un nouveau d'au moins 8 caractères, et la même confirmation. Le hash est remplacé. L'action est journalisée, sans le mot de passe.

## Pourquoi

Le profil montrait la fiche, sans moyen de remplacer le mot de passe de démonstration.

## Fichiers

- `backend/app/schemas/flux.py`
- `backend/app/services/comptes.py`
- `backend/app/api/comptes.py`
- `backend/tests/test_mot_de_passe.py`
- `frontend/src/features/auth/api.ts`
- `frontend/src/features/auth/mot-de-passe.tsx`
- `frontend/src/app/profil/page.tsx`
- `frontend/src/i18n/fr.json`

## Vérification

`pytest tests/test_mot_de_passe.py`. Ouvrir Profil, saisir l'actuel et un nouveau, puis se reconnecter avec le nouveau.

## Ensuite

Rien.
