"""Vues de lecture pour le tableau de bord.

Revision ID: 007_bi
Revises: 006_alertes
Create Date: 2026-10-15
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "007_bi"
down_revision: str | None = "006_alertes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "007_bi.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS bi.distribution_scores")
    op.execute("DROP VIEW IF EXISTS bi.decisions_humaines")
    op.execute("DROP VIEW IF EXISTS bi.alertes_par_statut")
    op.execute("DROP VIEW IF EXISTS bi.volumes")
    op.execute("DROP SCHEMA IF EXISTS bi")
