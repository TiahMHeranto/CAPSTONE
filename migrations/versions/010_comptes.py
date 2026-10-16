"""Lien compte vers assuré ou prestataire.

Revision ID: 010_comptes
Revises: 009_assistant
Create Date: 2026-10-16
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "010_comptes"
down_revision: str | None = "009_assistant"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "010_comptes.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS identites.lire_annuaire()")
    op.execute("ALTER TABLE app.utilisateurs DROP COLUMN IF EXISTS prestataire_id")
