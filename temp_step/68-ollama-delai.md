# Ollama reste chargé

## Fait

Les modèles `llama3.2` et `nomic-embed-text` sont dans le conteneur. Le corpus compte 184 fragments. Les premières questions échouaient parce que le chargement du modèle dépassait 60 secondes : l'API renvoyait `MODELE_INDISPONIBLE`, et l'écran affichait la phrase des factures.

L'appel attend maintenant 180 secondes et demande à Ollama de garder le modèle (`keep_alive` et `OLLAMA_KEEP_ALIVE=-1`). Un essai d'embedding renvoie 768 dimensions. Une seconde question, modèle déjà en mémoire, répond en environ 9 secondes.

## Pourquoi

Sans ce délai, le premier message après un redémarrage du conteneur échoue alors qu'Ollama fonctionne.

## Fichiers

- `backend/app/services/assistant.py`
- `docker-compose.yml`
- `frontend/src/features/assistant/conversation.tsx`
- `frontend/src/i18n/fr.json`

## Vérification

`docker compose exec ollama ollama list` montre les deux modèles. Un embedding de test a 768 valeurs. Le conteneur frontend est reconstruit pour la nouvelle phrase d'indisponibilité.

## Ensuite

Rien.
