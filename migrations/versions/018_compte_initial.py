"""Compte administrateur initial, sans comptes de démonstration.

Revision ID: 018_compte_initial
Revises: 017_compte_fiche
Create Date: 2026-10-21
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "018_compte_initial"
down_revision: str | None = "017_compte_fiche"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "018_compte_initial.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DELETE FROM app.utilisateurs WHERE identifiant = 'predicare'")
