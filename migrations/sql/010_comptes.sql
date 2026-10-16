-- Lien entre un compte et une personne du référentiel.
-- Un assuré pointe vers clean.assures. Un professionnel pointe vers clean.prestataires.

ALTER TABLE app.utilisateurs ADD COLUMN IF NOT EXISTS prestataire_id text;

CREATE OR REPLACE FUNCTION identites.lire_annuaire()
RETURNS TABLE (pseudo_id text, charge bytea)
LANGUAGE sql
SECURITY DEFINER
SET search_path = identites, pg_temp
AS $$
    SELECT pseudo_id, charge FROM identites.coffre;
$$;

REVOKE ALL ON FUNCTION identites.lire_annuaire() FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prediccare_app') THEN
        GRANT EXECUTE ON FUNCTION identites.lire_annuaire() TO prediccare_app;
    END IF;
END $$;
