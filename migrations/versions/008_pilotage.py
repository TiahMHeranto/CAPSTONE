"""Ordonnances au dépôt et indicateurs de pilotage.

Revision ID: 008_pilotage
Revises: 007_bi
Create Date: 2026-10-15
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "008_pilotage"
down_revision: str | None = "007_bi"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "008_pilotage.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS app.anomalies_prescription")
    op.execute("DROP FUNCTION IF EXISTS clean.diagnostic_incompatible(text, text[])")
    op.execute("DROP TABLE IF EXISTS clean.correspondance_diagnostic")
    op.execute("DROP TABLE IF EXISTS clean.ordonnance_lignes")
    op.execute(
        """
        CREATE OR REPLACE VIEW bi.volumes AS
        SELECT
            (SELECT count(*) FROM app.factures) AS nb_factures,
            (SELECT count(*) FROM app.predictions) AS nb_predictions,
            (SELECT count(*) FROM app.predictions WHERE classe = 'alerte') AS nb_alertes_modele,
            (SELECT count(*) FROM app.predictions WHERE classe = 'normale') AS nb_normales,
            (SELECT count(*) FROM app.alertes) AS nb_notifications,
            (SELECT count(*) FROM app.decisions) AS nb_decisions,
            (SELECT count(*) FROM app.audit_log WHERE action = 'rejet_facture') AS nb_rejets
        """
    )
