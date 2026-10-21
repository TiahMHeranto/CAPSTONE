"""Copie le barème de remboursement dans app.garanties.

Revision ID: 020_garanties_remboursement
Revises: 019_cache_effacement
Create Date: 2026-10-21
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "020_garanties_remboursement"
down_revision: str | None = "019_cache_effacement"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "020_garanties_remboursement.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DELETE FROM app.garanties")
