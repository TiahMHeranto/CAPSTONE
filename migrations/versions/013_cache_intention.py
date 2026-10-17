"""Intention dans le cache de l'assistant.

Revision ID: 013_cache_intention
Revises: 012_creer_ordonnance
Create Date: 2026-10-16
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "013_cache_intention"
down_revision: str | None = "012_creer_ordonnance"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "013_cache_intention.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("ALTER TABLE app.assistant_cache DROP COLUMN IF EXISTS intention")
