"""Vues dossier de l'assistant et politiques du rôle agent.

Revision ID: 015_dossier_vues
Revises: 013_cache_intention
Create Date: 2026-10-17
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "015_dossier_vues"
down_revision: str | None = "013_cache_intention"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SQL = Path(__file__).resolve().parents[1] / "sql" / "015_dossier_vues.sql"


def _ordres(script: str) -> list[str]:
    ordres = []
    for bloc in script.split(";"):
        lignes = [ligne for ligne in bloc.splitlines() if not ligne.strip().startswith("--")]
        ordre = "\n".join(lignes).strip()
        if ordre:
            ordres.append(ordre)
    return ordres


def upgrade() -> None:
    for ordre in _ordres(_SQL.read_text(encoding="utf-8")):
        op.execute(ordre)


def downgrade() -> None:
    for vue in (
        "clean.dossier_contrats",
        "clean.dossier_assures",
        "clean.dossier_ordonnance_lignes",
        "clean.dossier_ordonnances",
        "clean.dossier_lignes",
        "clean.dossier_factures",
    ):
        op.execute(f"DROP VIEW IF EXISTS {vue}")
    op.execute("ALTER ROLE prediccare_agent RESET statement_timeout")
