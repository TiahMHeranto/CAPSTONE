"""Registre des fiches modèle.

Revision ID: 004_registry
Revises: 003_pseudo
Create Date: 2026-10-14
"""

from collections.abc import Sequence

from alembic import op

revision: str = "004_registry"
down_revision: str | None = "003_pseudo"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE app.model_registry (
            version text PRIMARY KEY,
            algorithme text NOT NULL,
            seuil_metier numeric NOT NULL,
            nb_colonnes integer NOT NULL,
            metriques jsonb NOT NULL,
            colonnes jsonb NOT NULL,
            metadata_sha256 text NOT NULL,
            artefact_present boolean NOT NULL,
            updated_at timestamptz NOT NULL DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS app.model_registry")
