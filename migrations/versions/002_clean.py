"""Schéma clean et fonctions de conversion.

Revision ID: 002_clean
Revises: 001_socle
Create Date: 2026-10-14
"""

from collections.abc import Sequence

from alembic import op

revision: str = "002_clean"
down_revision: str | None = "001_socle"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CLEAN_SQL = """
CREATE SCHEMA IF NOT EXISTS clean;

CREATE FUNCTION clean.to_int(value text) RETURNS bigint
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF value IS NULL OR value !~ '^-?[0-9]+$' THEN
        RETURN NULL;
    END IF;
    RETURN value::bigint;
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN NULL;
END;
$$;

CREATE FUNCTION clean.to_num(value text) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF value IS NULL OR value !~ '^-?[0-9]+([.][0-9]+)?$' THEN
        RETURN NULL;
    END IF;
    RETURN value::numeric;
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN NULL;
END;
$$;

CREATE FUNCTION clean.to_date(value text) RETURNS date
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    IF value IS NULL OR value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        RETURN NULL;
    END IF;
    RETURN value::date;
EXCEPTION
    WHEN invalid_datetime_format OR datetime_field_overflow THEN
        RETURN NULL;
END;
$$;

CREATE TABLE clean.referentiel_actes (
    code_acte text PRIMARY KEY,
    libelle text,
    categorie text
);

CREATE TABLE clean.referentiel_medicaments (
    code_medicament text PRIMARY KEY,
    libelle text,
    remboursable boolean
);

CREATE TABLE clean.prestataires (
    prestataire_id text PRIMARY KEY,
    nom text,
    type_prestataire text,
    ville text,
    statut text
);

CREATE TABLE clean.contrats (
    contrat_id text PRIMARY KEY,
    formule text,
    date_effet date,
    date_fin date,
    statut text
);

CREATE TABLE clean.assures (
    assure_id text PRIMARY KEY,
    contrat_id text,
    sexe text,
    annee_naissance integer,
    ville text,
    date_adhesion date,
    date_radiation date
);

CREATE TABLE clean.ordonnances (
    ordonnance_id text PRIMARY KEY,
    assure_id text,
    prescripteur_id text,
    date_prescription date,
    validite_jours integer
);

CREATE TABLE clean.factures (
    facture_id text PRIMARY KEY,
    prestataire_id text,
    assure_id text,
    contrat_id text,
    ordonnance_id text,
    type_facture text,
    date_soin date,
    date_facture date,
    date_reception date,
    date_traitement date,
    devise text,
    nb_lignes integer,
    montant_total bigint,
    montant_eligible bigint,
    montant_pris_en_charge bigint,
    reste_a_charge bigint,
    statut text,
    motif_rejet text
);

CREATE TABLE clean.lignes_facture (
    ligne_id text PRIMARY KEY,
    facture_id text NOT NULL,
    num_ligne integer,
    code text,
    type_ligne text,
    quantite numeric,
    prix_unitaire bigint,
    montant bigint
);

CREATE TABLE clean.anomalies (
    id bigserial PRIMARY KEY,
    regle text NOT NULL,
    decision text NOT NULL,
    table_cible text NOT NULL,
    identifiant text,
    detail text NOT NULL
);

CREATE INDEX clean_anomalies_regle_idx ON clean.anomalies (regle);
REVOKE ALL ON SCHEMA clean FROM PUBLIC;
"""


def upgrade() -> None:
    op.execute(CLEAN_SQL)


def downgrade() -> None:
    op.execute("DROP SCHEMA IF EXISTS clean CASCADE")
