"""Droit d'effacer le cache de l'assistant après une réindexation.

Revision ID: 019_cache_effacement
Revises: 018_compte_initial
Create Date: 2026-10-21
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "019_cache_effacement"
down_revision: str | None = "018_compte_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "019_cache_effacement.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("REVOKE DELETE ON app.assistant_cache FROM prediccare_app")
