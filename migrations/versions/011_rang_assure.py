"""Rang et assuré principal dans clean.assures.

Revision ID: 011_rang_assure
Revises: 010_comptes
Create Date: 2026-10-16
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "011_rang_assure"
down_revision: str | None = "010_comptes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "011_rang_assure.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("ALTER TABLE clean.assures DROP COLUMN IF EXISTS assure_principal_id")
    op.execute("ALTER TABLE clean.assures DROP COLUMN IF EXISTS rang_beneficiaire")
