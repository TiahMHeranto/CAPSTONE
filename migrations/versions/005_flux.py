"""Comptes, durée de score, et dépôt sans clé étrangère vers app.

Les factures déposées citent les pseudonymes de clean. Les clés étrangères
vers les tables app, encore vides, empêcheraient cet enregistrement.

Revision ID: 005_flux
Revises: 004_registry
Create Date: 2026-10-15
"""

from collections.abc import Sequence

from alembic import op

revision: str = "005_flux"
down_revision: str | None = "004_registry"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE app.utilisateurs (
            identifiant text PRIMARY KEY,
            mot_de_passe_hash text NOT NULL,
            role text NOT NULL,
            assure_id text,
            actif boolean NOT NULL DEFAULT true,
            CONSTRAINT utilisateurs_role_connu CHECK (
                role IN ('prestataire', 'assure', 'gestionnaire', 'administrateur')
            )
        )
        """
    )
    op.execute("ALTER TABLE app.predictions ADD COLUMN duree_ms integer")
    op.execute("ALTER TABLE app.factures ADD COLUMN soumis_par text")
    op.execute("ALTER TABLE app.factures DROP CONSTRAINT IF EXISTS factures_prestataire_id_fkey")
    op.execute("ALTER TABLE app.factures DROP CONSTRAINT IF EXISTS factures_assure_id_fkey")
    op.execute("ALTER TABLE app.factures DROP CONSTRAINT IF EXISTS factures_contrat_id_fkey")
    op.execute("ALTER TABLE app.factures DROP CONSTRAINT IF EXISTS factures_ordonnance_id_fkey")
    op.execute("CREATE INDEX decisions_facture_id_idx ON app.decisions (facture_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS decisions_facture_id_idx")
    op.execute(
        """
        ALTER TABLE app.factures
            ADD CONSTRAINT factures_prestataire_id_fkey
            FOREIGN KEY (prestataire_id) REFERENCES app.prestataires (prestataire_id)
        """
    )
    op.execute(
        """
        ALTER TABLE app.factures
            ADD CONSTRAINT factures_assure_id_fkey
            FOREIGN KEY (assure_id) REFERENCES app.assures (assure_id)
        """
    )
    op.execute(
        """
        ALTER TABLE app.factures
            ADD CONSTRAINT factures_contrat_id_fkey
            FOREIGN KEY (contrat_id) REFERENCES app.contrats (contrat_id)
        """
    )
    op.execute(
        """
        ALTER TABLE app.factures
            ADD CONSTRAINT factures_ordonnance_id_fkey
            FOREIGN KEY (ordonnance_id) REFERENCES app.ordonnances (ordonnance_id)
        """
    )
    op.execute("ALTER TABLE app.factures DROP COLUMN IF EXISTS soumis_par")
    op.execute("ALTER TABLE app.predictions DROP COLUMN IF EXISTS duree_ms")
    op.execute("DROP TABLE IF EXISTS app.utilisateurs")
