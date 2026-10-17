-- Dépôt d'une ordonnance par le professionnel connecté.
-- L'API n'a que SELECT sur clean. La fonction écrit au nom du propriétaire.

CREATE OR REPLACE FUNCTION app.creer_ordonnance(
    p_ordonnance_id text,
    p_assure_id text,
    p_prescripteur_id text,
    p_date date,
    p_validite integer,
    p_lignes jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = clean, pg_temp
AS $$
DECLARE
    ligne jsonb;
    numero integer := 0;
BEGIN
    INSERT INTO ordonnances (
        ordonnance_id, assure_id, prescripteur_id, date_prescription, validite_jours
    ) VALUES (
        p_ordonnance_id, p_assure_id, p_prescripteur_id, p_date, p_validite
    );
    FOR ligne IN SELECT value FROM jsonb_array_elements(p_lignes)
    LOOP
        numero := numero + 1;
        INSERT INTO ordonnance_lignes (ordonnance_id, num_ligne, code, quantite)
        VALUES (
            p_ordonnance_id,
            numero,
            ligne->>'code',
            (ligne->>'quantite')::numeric
        );
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION app.creer_ordonnance(text, text, text, date, integer, jsonb) FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prediccare_app') THEN
        GRANT EXECUTE ON FUNCTION app.creer_ordonnance(text, text, text, date, integer, jsonb)
            TO prediccare_app;
    END IF;
END $$;
