# 30 — Nom de l'assuré principal sur le profil

## Fait

Le profil affiche le nom et les prénoms de l'assuré principal, lus dans le coffre à partir de son pseudonyme. Le pseudonyme n'est plus renvoyé dans ce champ. La ligne « Lien » a été retirée de la page profil.

## Pourquoi

L'écran montrait l'identifiant pseudonymisé, illisible pour la personne connectée.

## Fichiers

`backend/app/services/comptes.py`, `backend/app/services/assistant.py`, `frontend/app/(espace)/profil/page.tsx`, `backend/tests/test_comptes.py`, `backend/tests/test_assistant.py`.

## Vérification

`pytest tests/test_comptes.py tests/test_assistant.py` : un enfant reçoit le nom du principal, distinct du sien, et `assure_principal_id` n'est pas dans la réponse. Cache assistant vidé.
