"""Schéma initial : raw, identités, labels, tables applicatives.

Revision ID: 001_socle
Revises:
Create Date: 2026-10-14
"""

from collections.abc import Sequence

from alembic import op

from app.db.catalog import (
    IDENTITES_COLUMNS,
    LABELS_FRAUDE_COLUMNS,
    LABELS_PRESTATAIRES_COLUMNS,
    RAW_TABLES,
)

revision: str = "001_socle"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

APP_SQL = """
CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.referentiel_actes (
    code_acte text PRIMARY KEY,
    libelle text NOT NULL,
    categorie text NOT NULL,
    specialite text,
    tarif_min integer,
    tarif_reference integer,
    tarif_max integer,
    ordonnance_requise boolean NOT NULL DEFAULT false,
    entente_prealable boolean NOT NULL DEFAULT false,
    sexe_requis text,
    age_min integer,
    age_max integer
);

CREATE TABLE app.referentiel_medicaments (
    code_medicament text PRIMARY KEY,
    libelle text NOT NULL,
    prix_reference integer,
    remboursable boolean NOT NULL,
    classe text,
    chronique boolean NOT NULL DEFAULT false
);

CREATE TABLE app.prestataires (
    prestataire_id text PRIMARY KEY,
    nom text NOT NULL,
    type_prestataire text NOT NULL,
    specialite text,
    ville text,
    niveau_tarif text,
    conventionne boolean NOT NULL DEFAULT true,
    statut text NOT NULL
);

CREATE TABLE app.grille_tarifaire (
    prestataire_id text NOT NULL REFERENCES app.prestataires (prestataire_id),
    code text NOT NULL,
    tarif_pratique integer NOT NULL,
    PRIMARY KEY (prestataire_id, code)
);

CREATE TABLE app.contrats (
    contrat_id text PRIMARY KEY,
    numero_police text NOT NULL,
    formule text NOT NULL,
    date_effet date,
    date_fin date,
    statut text NOT NULL,
    nb_beneficiaires integer,
    prime_annuelle_totale integer
);

CREATE TABLE app.garanties (
    formule text NOT NULL,
    categorie text NOT NULL,
    taux_remboursement numeric NOT NULL,
    plafond_annuel_categorie integer,
    franchise_par_facture integer,
    delai_carence_jours integer,
    plafond_annuel_global integer,
    attestation_requise boolean NOT NULL DEFAULT false,
    actes_exclus text,
    PRIMARY KEY (formule, categorie)
);

CREATE TABLE app.assures (
    assure_id text PRIMARY KEY,
    contrat_id text NOT NULL REFERENCES app.contrats (contrat_id),
    rang_beneficiaire text NOT NULL,
    assure_principal_id text,
    sexe text,
    annee_naissance integer,
    ville text,
    date_adhesion date,
    date_radiation date
);

CREATE TABLE app.ordonnances (
    ordonnance_id text PRIMARY KEY,
    assure_id text NOT NULL REFERENCES app.assures (assure_id),
    prescripteur_id text REFERENCES app.prestataires (prestataire_id),
    date_prescription date,
    validite_jours integer
);

CREATE TABLE app.ordonnance_lignes (
    ordonnance_id text NOT NULL REFERENCES app.ordonnances (ordonnance_id),
    num_ligne integer NOT NULL,
    code text NOT NULL,
    libelle text,
    quantite numeric,
    PRIMARY KEY (ordonnance_id, num_ligne)
);

CREATE TABLE app.factures (
    facture_id text PRIMARY KEY,
    prestataire_id text REFERENCES app.prestataires (prestataire_id),
    assure_id text REFERENCES app.assures (assure_id),
    contrat_id text REFERENCES app.contrats (contrat_id),
    ordonnance_id text REFERENCES app.ordonnances (ordonnance_id),
    type_facture text,
    date_soin date,
    date_facture date,
    date_reception date,
    canal_reception text,
    mode_reglement text,
    devise text,
    nb_lignes integer,
    montant_total integer,
    montant_eligible integer,
    montant_pris_en_charge integer,
    reste_a_charge integer,
    statut text,
    motif_rejet text,
    date_traitement date
);

CREATE TABLE app.lignes_facture (
    ligne_id text PRIMARY KEY,
    facture_id text NOT NULL REFERENCES app.factures (facture_id),
    num_ligne integer NOT NULL,
    code text NOT NULL,
    type_ligne text NOT NULL,
    libelle text,
    quantite numeric,
    prix_unitaire integer,
    montant integer
);

CREATE TABLE app.predictions (
    id bigserial PRIMARY KEY,
    facture_id text NOT NULL,
    score numeric NOT NULL,
    classe text NOT NULL,
    model_version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.shap_explanations (
    id bigserial PRIMARY KEY,
    prediction_id bigint NOT NULL REFERENCES app.predictions (id),
    rang integer NOT NULL,
    variable text NOT NULL,
    contribution numeric NOT NULL,
    libelle text
);

CREATE TABLE app.decisions (
    id bigserial PRIMARY KEY,
    facture_id text NOT NULL,
    prediction_id bigint REFERENCES app.predictions (id),
    acteur text,
    decision text NOT NULL,
    motif text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.documents (
    id bigserial PRIMARY KEY,
    source text NOT NULL,
    page integer,
    contenu text NOT NULL,
    embedding vector(384)
);

CREATE TABLE app.audit_log (
    id bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    acteur text,
    action text NOT NULL,
    entite text,
    entite_id text,
    detail jsonb
);

CREATE INDEX predictions_facture_id_idx ON app.predictions (facture_id);
"""


def _create_text_table(schema: str, name: str, columns: list[str]) -> None:
    cols = ", ".join(f"{column} text" for column in columns)
    op.execute(f"CREATE TABLE {schema}.{name} ({cols})")


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE SCHEMA IF NOT EXISTS raw")
    for name, columns in RAW_TABLES.items():
        _create_text_table("raw", name, columns)
    op.execute("CREATE SCHEMA IF NOT EXISTS identites")
    _create_text_table("identites", "identites_pii", IDENTITES_COLUMNS)
    op.execute("CREATE SCHEMA IF NOT EXISTS labels")
    _create_text_table("labels", "labels_fraude", LABELS_FRAUDE_COLUMNS)
    _create_text_table("labels", "labels_prestataires", LABELS_PRESTATAIRES_COLUMNS)
    op.execute(APP_SQL)
    op.execute("REVOKE ALL ON SCHEMA identites FROM PUBLIC")
    op.execute("REVOKE ALL ON SCHEMA labels FROM PUBLIC")
    op.execute("REVOKE ALL ON SCHEMA raw FROM PUBLIC")


def downgrade() -> None:
    op.execute("DROP SCHEMA IF EXISTS app CASCADE")
    op.execute("DROP SCHEMA IF EXISTS labels CASCADE")
    op.execute("DROP SCHEMA IF EXISTS identites CASCADE")
    op.execute("DROP SCHEMA IF EXISTS raw CASCADE")
