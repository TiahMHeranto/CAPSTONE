# 28 — Profil de l'assuré dans l'assistant

## Fait

Quand le rôle est assuré, la question envoyée au modèle inclut la fiche du jeton : nom, prénoms, sexe, ville, date d'adhésion, et le contrat (identifiant, formule, statut, date d'effet). Les autres rôles reçoivent un bloc vide. Le pseudonyme vient de la session, pas de la question.

## Pourquoi

L'assistant lisait les extraits et les factures, pas la fiche ni la formule du contrat de la personne connectée.

## Fichiers

`backend/app/services/assistant.py`, `backend/app/services/comptes.py`, `backend/tests/test_assistant.py`, `frontend/app/(espace)/assistant/page.tsx`.

## Vérification

`pytest backend/tests/test_assistant.py` : seul l'assuré déclenche la lecture de la fiche, et la formule reçue est ESSENTIEL pour `CTR-000638`. Les trois autres rôles n'ont pas de fiche.

Vider le cache pour ne pas resservir une réponse d'avant ce contexte : `TRUNCATE app.assistant_cache`.

## Ensuite

Canal Slack ou e-mail réel, distribution de référence du modèle, guide par rôle, dossier FinOps.
