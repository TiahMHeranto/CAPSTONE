"""Dépôt d'ordonnance par le professionnel.

Revision ID: 012_creer_ordonnance
Revises: 011_rang_assure
Create Date: 2026-10-16
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "012_creer_ordonnance"
down_revision: str | None = "011_rang_assure"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "012_creer_ordonnance.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        "DROP FUNCTION IF EXISTS app.creer_ordonnance(text, text, text, date, integer, jsonb)"
    )
