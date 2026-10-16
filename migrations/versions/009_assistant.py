"""Corpus vectoriel et cache de l'assistant.

Revision ID: 009_assistant
Revises: 008_pilotage
Create Date: 2026-10-15
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "009_assistant"
down_revision: str | None = "008_pilotage"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "009_assistant.sql"


def upgrade() -> None:
    op.execute(_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS app.assistant_cache")
    op.execute("DROP INDEX IF EXISTS documents_source_page_fragment_idx")
    op.execute("ALTER TABLE app.documents DROP COLUMN IF EXISTS fragment")
    op.execute("ALTER TABLE app.documents DROP COLUMN IF EXISTS contrat_id")
    op.execute("ALTER TABLE app.documents DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE app.documents ADD COLUMN embedding vector(384)")
