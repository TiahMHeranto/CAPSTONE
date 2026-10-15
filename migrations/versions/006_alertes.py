"""Journal des alertes envoyées par le workflow n8n.

Revision ID: 006_alertes
Revises: 005_flux
Create Date: 2026-10-15
"""

from collections.abc import Sequence

from alembic import op

revision: str = "006_alertes"
down_revision: str | None = "005_flux"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS app.alertes (
            id bigserial PRIMARY KEY,
            facture_id text NOT NULL,
            canal text NOT NULL,
            statut text NOT NULL,
            tentative integer NOT NULL DEFAULT 1,
            score numeric,
            message text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT alertes_canal_connu CHECK (canal IN ('slack', 'email', 'webhook')),
            CONSTRAINT alertes_statut_connu CHECK (statut IN ('envoye', 'echec'))
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS alertes_statut_idx ON app.alertes (statut, id DESC)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS app.alertes")
