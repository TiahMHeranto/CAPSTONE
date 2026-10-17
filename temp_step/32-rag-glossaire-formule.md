# 32 — Glossaire et formule dans le RAG

## Fait

La question envoyée à l'embedding est enrichie avec les synonymes du notebook M3 (unité monétaire vers ariary, carence, plafond, maternité, etc.). Le texte montré au modèle reste la question d'origine.

Un assuré ne reçoit plus les conditions générales des autres formules : seulement la sienne, plus les guides, le barème et ses conditions particulières. Un autre rôle qui cite une seule formule est limité de la même façon. Le prompt demande de ne pas mélanger les plafonds, et de les séparer quand plusieurs formules sont dans les extraits.

## Pourquoi

Le notebook montrait qu'une question sur la maternité ramenait à la fois le délai ESSENTIEL et le délai PREMIUM. Le vocabulaire courant (« unité monétaire », « avant d'être remboursé ») ne recoupait pas les mots des PDF.

## Pas repris

Le modèle bge-m3, le reranker et le découpage ligne à ligne des tableaux restent dans le notebook. Les remplacer ici changerait les embeddings 768 d'Ollama et exigerait de réindexer tout le corpus. Le score de rejet du notebook n'est pas sur la même échelle que la distance pgvector.

## Fichiers

`backend/app/rag/glossaire.py`, `backend/app/services/assistant.py`, `backend/tests/test_assistant.py`, `frontend/app/(espace)/assistant/page.tsx`.

## Vérification

`pytest tests/test_assistant.py` : 9 tests passés. « unité monétaire » ajoute ariary. Un assuré ESSENTIEL qui demande PREMIUM reste sur ESSENTIEL. Cache assistant vidé.
