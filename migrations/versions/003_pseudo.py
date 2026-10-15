"""Coffre d'identités et pseudonymes.

Revision ID: 003_pseudo
Revises: 002_clean
Create Date: 2026-10-14
"""

from collections.abc import Sequence

from alembic import op

revision: str = "003_pseudo"
down_revision: str | None = "002_clean"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UPGRADE_SQL = """
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE identites.coffre (
    pseudo_id text PRIMARY KEY,
    charge bytea NOT NULL
);

REVOKE ALL ON identites.coffre FROM PUBLIC;

CREATE FUNCTION clean.pseudo(value text) RETURNS text
LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN value IS NULL OR value = '' THEN NULL
        ELSE encode(
            hmac(
                convert_to(value, 'UTF8'),
                convert_to(current_setting('prediccare.pseudo_key'), 'UTF8'),
                'sha256'
            ),
            'hex'
        )
    END;
$$;

CREATE FUNCTION clean.tranche_age(annee integer, reference integer) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN annee IS NULL OR reference IS NULL THEN NULL
        WHEN reference - annee < 0 THEN NULL
        WHEN reference - annee < 18 THEN '0-17'
        WHEN reference - annee < 40 THEN '18-39'
        WHEN reference - annee < 60 THEN '40-59'
        ELSE '60+'
    END;
$$;

ALTER TABLE clean.assures ADD COLUMN tranche_age text;
ALTER TABLE clean.assures DROP COLUMN annee_naissance;

ALTER TABLE app.assures ADD COLUMN tranche_age text;
ALTER TABLE app.assures DROP COLUMN annee_naissance;

CREATE FUNCTION identites.lire_charge(p_pseudo text) RETURNS bytea
LANGUAGE sql SECURITY DEFINER SET search_path = identites, pg_temp AS $$
    SELECT charge FROM identites.coffre WHERE pseudo_id = p_pseudo;
$$;

CREATE FUNCTION identites.effacer_charge(p_pseudo text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identites, pg_temp AS $$
DECLARE
    removed integer;
BEGIN
    DELETE FROM identites.coffre WHERE pseudo_id = p_pseudo;
    GET DIAGNOSTICS removed = ROW_COUNT;
    RETURN removed > 0;
END;
$$;

REVOKE ALL ON FUNCTION identites.lire_charge(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION identites.effacer_charge(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION clean.pseudo(text) FROM PUBLIC;
"""

DOWNGRADE_SQL = """
DROP FUNCTION IF EXISTS identites.effacer_charge(text);
DROP FUNCTION IF EXISTS identites.lire_charge(text);
DROP TABLE IF EXISTS identites.coffre;
DROP FUNCTION IF EXISTS clean.pseudo(text);
DROP FUNCTION IF EXISTS clean.tranche_age(integer, integer);
ALTER TABLE clean.assures ADD COLUMN annee_naissance integer;
ALTER TABLE clean.assures DROP COLUMN IF EXISTS tranche_age;
ALTER TABLE app.assures ADD COLUMN annee_naissance integer;
ALTER TABLE app.assures DROP COLUMN IF EXISTS tranche_age;
"""


def upgrade() -> None:
    op.execute(UPGRADE_SQL)


def downgrade() -> None:
    op.execute(DOWNGRADE_SQL)
