-- L'indexation retire les réponses devenues fausses après un changement de document.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prediccare_app') THEN
        GRANT DELETE ON app.assistant_cache TO prediccare_app;
    END IF;
END $$;
