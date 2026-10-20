"""Adresse, date de création et suppression douce des comptes.

Revision ID: 017_compte_fiche
Revises: 016_features_v2
Create Date: 2026-10-20
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "017_compte_fiche"
down_revision: str | None = "016_features_v2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "017_compte_fiche.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS utilisateurs_email_actif_idx")
    op.execute("ALTER TABLE app.utilisateurs DROP COLUMN IF EXISTS email")
    op.execute("ALTER TABLE app.utilisateurs DROP COLUMN IF EXISTS is_deleted")
    op.execute("ALTER TABLE app.utilisateurs DROP COLUMN IF EXISTS created_at")
