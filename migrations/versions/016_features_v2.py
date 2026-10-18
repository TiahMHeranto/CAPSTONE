"""Colonnes du pipeline v2 sur les prestataires et le référentiel.

Revision ID: 016_features_v2
Revises: 015_dossier_vues
Create Date: 2026-10-18
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "016_features_v2"
down_revision: str | None = "015_dossier_vues"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "016_features_v2.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("ALTER TABLE clean.referentiel_actes DROP COLUMN IF EXISTS tarif_max")
    op.execute("ALTER TABLE clean.referentiel_actes DROP COLUMN IF EXISTS tarif_reference")
    op.execute("ALTER TABLE clean.prestataires DROP COLUMN IF EXISTS jours_ouverture")
    op.execute("ALTER TABLE clean.prestataires DROP COLUMN IF EXISTS date_fin_convention")
