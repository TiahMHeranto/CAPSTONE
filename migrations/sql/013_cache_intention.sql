-- Le cache ne ressert pas une réponse de contrat à une question de dossier.

ALTER TABLE app.assistant_cache
    ADD COLUMN IF NOT EXISTS intention text NOT NULL DEFAULT 'contrat';
