-- Fiche de compte : adresse, date de création, suppression douce.

ALTER TABLE app.utilisateurs ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE app.utilisateurs ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE app.utilisateurs ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE app.utilisateurs
SET email = identifiant || '@prediccare.mg'
WHERE email IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS utilisateurs_email_actif_idx
    ON app.utilisateurs (lower(email))
    WHERE is_deleted = false;

ALTER TABLE app.utilisateurs ALTER COLUMN email SET NOT NULL;
