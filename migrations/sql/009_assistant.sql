-- Corpus de l'assistant. nomic-embed-text produit 768 dimensions.
-- Le diagnostic, les labels et les identités ne sont pas indexés.

ALTER TABLE app.documents DROP COLUMN IF EXISTS embedding;
ALTER TABLE app.documents ADD COLUMN embedding vector(768);
ALTER TABLE app.documents ADD COLUMN IF NOT EXISTS contrat_id text;
ALTER TABLE app.documents ADD COLUMN IF NOT EXISTS fragment integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS documents_source_page_fragment_idx
    ON app.documents (source, page, fragment);

CREATE TABLE IF NOT EXISTS app.assistant_cache (
    id bigserial PRIMARY KEY,
    empreinte text NOT NULL UNIQUE,
    role text NOT NULL,
    assure_id text,
    embedding vector(768) NOT NULL,
    reponse text NOT NULL,
    sources jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prediccare_app') THEN
        GRANT SELECT, INSERT, DELETE ON app.documents TO prediccare_app;
        GRANT SELECT, INSERT ON app.assistant_cache TO prediccare_app;
        GRANT USAGE, SELECT ON SEQUENCE app.documents_id_seq TO prediccare_app;
        GRANT USAGE, SELECT ON SEQUENCE app.assistant_cache_id_seq TO prediccare_app;
    END IF;
END $$;
