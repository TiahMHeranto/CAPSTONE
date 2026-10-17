import logging
import time
from pathlib import Path

import psycopg
from alembic import command
from alembic.config import Config
from psycopg import sql

from app.cleaning.rebuild import rebuild_clean
from app.config import settings
from app.core.logging import configure_logging
from app.core.tokens import hacher
from app.db.seed import seed_if_empty
from app.privacy.protect import proteger_identites
from app.privacy.scan import scanner, secrets_identites
from app.services.registry import VERSION_SIMULEE, lister_fiches

logger = logging.getLogger(__name__)


def main() -> None:
    configure_logging()
    wait_for_database()
    ensure_roles()
    upgrade()
    grant_app_role()
    ensure_alert_threshold()
    ensure_comptes()
    enregistrer_modeles()
    with psycopg.connect(settings.psycopg_migrate_url) as connection:
        dataset = Path(settings.dataset_dir)
        seed_if_empty(connection, dataset, Path(settings.labels_dir))
        rebuild_clean(connection)
        proteger_identites(
            connection,
            dataset,
            settings.pseudo_hmac_key,
            settings.pii_encryption_key,
        )
        trouvailles = scanner(connection, secrets_identites(dataset / "identites_pii.csv"))
        if trouvailles:
            logger.error("scan pii colonnes=%s", ",".join(trouvailles))
            raise SystemExit("scan pii: " + ",".join(trouvailles))
        desalignes = connection.execute(
            """
            SELECT count(*) FROM clean.assures AS assure
            WHERE NOT EXISTS (
                SELECT 1 FROM identites.coffre AS coffre
                WHERE coffre.pseudo_id = assure.assure_id
            )
            """
        ).fetchone()
        if desalignes and desalignes[0]:
            logger.error("pseudonymes desalignes n=%s", desalignes[0])
            raise SystemExit("pseudonymes clean et coffre desalignes")
        connection.commit()
    logger.info("bootstrap termine")


def wait_for_database() -> None:
    last_error = "inconnue"
    for attempt in range(1, 31):
        try:
            with psycopg.connect(settings.psycopg_migrate_url, connect_timeout=3):
                return
        except Exception as exc:
            last_error = type(exc).__name__
            logger.warning("attente de la base tentative=%s erreur=%s", attempt, last_error)
            time.sleep(2)
    raise SystemExit("base inaccessible")


def ensure_roles() -> None:
    with psycopg.connect(settings.psycopg_migrate_url, autocommit=True) as connection:
        _ensure_role(connection, settings.app_db_user, settings.app_db_password)
        _ensure_role(connection, settings.agent_db_user, settings.agent_db_password)
        _ensure_role(connection, settings.bi_db_user, settings.bi_db_password)


def _ensure_role(connection: psycopg.Connection, name: str, password: str) -> None:
    exists = connection.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (name,)).fetchone()
    statement = "ALTER ROLE {} PASSWORD {}" if exists else "CREATE ROLE {} LOGIN PASSWORD {}"
    connection.execute(sql.SQL(statement).format(sql.Identifier(name), sql.Literal(password)))


def upgrade() -> None:
    command.upgrade(Config("alembic.ini"), "head")


def grant_app_role() -> None:
    app_user = sql.Identifier(settings.app_db_user)
    agent_user = sql.Identifier(settings.agent_db_user)
    bi_user = sql.Identifier(settings.bi_db_user)
    statements = [
        sql.SQL("GRANT USAGE ON SCHEMA app TO {}").format(app_user),
        sql.SQL("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO {}").format(
            app_user
        ),
        sql.SQL("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO {}").format(app_user),
        sql.SQL("GRANT USAGE ON SCHEMA clean TO {}").format(app_user),
        sql.SQL("GRANT SELECT ON ALL TABLES IN SCHEMA clean TO {}").format(app_user),
        sql.SQL("REVOKE ALL ON ALL TABLES IN SCHEMA identites FROM {}").format(app_user),
        sql.SQL("GRANT USAGE ON SCHEMA identites TO {}").format(app_user),
        sql.SQL("GRANT EXECUTE ON FUNCTION identites.lire_charge(text) TO {}").format(app_user),
        sql.SQL("GRANT EXECUTE ON FUNCTION identites.lire_annuaire() TO {}").format(app_user),
        sql.SQL(
            "GRANT EXECUTE ON FUNCTION app.creer_ordonnance"
            "(text, text, text, date, integer, jsonb) TO {}"
        ).format(app_user),
        sql.SQL("GRANT EXECUTE ON FUNCTION identites.effacer_charge(text) TO {}").format(app_user),
        sql.SQL("REVOKE ALL ON SCHEMA labels FROM {}").format(app_user),
        sql.SQL("REVOKE ALL ON SCHEMA raw FROM {}").format(app_user),
        sql.SQL("REVOKE ALL ON SCHEMA identites FROM {}").format(agent_user),
        sql.SQL("REVOKE ALL ON SCHEMA labels FROM {}").format(agent_user),
        sql.SQL("REVOKE ALL ON SCHEMA raw FROM {}").format(agent_user),
        sql.SQL("GRANT USAGE ON SCHEMA clean TO {}").format(agent_user),
        sql.SQL("GRANT USAGE ON SCHEMA bi TO {}").format(app_user),
        sql.SQL("GRANT SELECT ON ALL TABLES IN SCHEMA bi TO {}").format(app_user),
        sql.SQL("GRANT USAGE ON SCHEMA bi TO {}").format(bi_user),
        sql.SQL("GRANT SELECT ON ALL TABLES IN SCHEMA bi TO {}").format(bi_user),
        sql.SQL("REVOKE ALL ON SCHEMA app FROM {}").format(bi_user),
        sql.SQL("REVOKE ALL ON SCHEMA clean FROM {}").format(bi_user),
        sql.SQL("REVOKE ALL ON SCHEMA identites FROM {}").format(bi_user),
        sql.SQL("REVOKE ALL ON SCHEMA labels FROM {}").format(bi_user),
        sql.SQL("REVOKE ALL ON SCHEMA raw FROM {}").format(bi_user),
    ]
    agent_tables = ("assures", "factures", "lignes_facture", "ordonnances")
    for table in agent_tables:
        statements.append(
            sql.SQL("GRANT SELECT ON clean.{} TO {}").format(sql.Identifier(table), agent_user)
        )
    with psycopg.connect(settings.psycopg_migrate_url, autocommit=True) as connection:
        for statement in statements:
            connection.execute(statement)
        _limiter_agent(connection, app_user, agent_user)
        with psycopg.ClientCursor(connection) as curseur:
            curseur.execute(_sql_dossier().read_text(encoding="utf-8"))


def _sql_dossier() -> Path:
    nom = "015_dossier_vues.sql"
    ici = Path(__file__).resolve()
    for parent in ici.parents:
        candidat = parent / "migrations" / "sql" / nom
        if candidat.is_file():
            return candidat
    raise FileNotFoundError(nom)


def _limiter_agent(connection: psycopg.Connection, app_user, agent_user) -> None:
    compte = (
        "(nullif(current_setting('prediccare.assure_id', true), '') IS NOT NULL "
        "AND {colonne} = current_setting('prediccare.assure_id', true)) "
        "OR (nullif(current_setting('prediccare.prestataire_id', true), '') IS NOT NULL "
        "AND {autre} = current_setting('prediccare.prestataire_id', true))"
    )
    filtres = {
        "assures": "assure_id = current_setting('prediccare.assure_id', true)",
        "factures": compte.format(colonne="assure_id", autre="prestataire_id"),
        "ordonnances": compte.format(colonne="assure_id", autre="prescripteur_id"),
        "lignes_facture": (
            "EXISTS (SELECT 1 FROM clean.factures AS facture "
            "WHERE facture.facture_id = lignes_facture.facture_id AND ("
            + compte.format(colonne="facture.assure_id", autre="facture.prestataire_id")
            + "))"
        ),
    }
    for table, filtre in filtres.items():
        nom = sql.Identifier(table)
        connection.execute(sql.SQL("ALTER TABLE clean.{} ENABLE ROW LEVEL SECURITY").format(nom))
        connection.execute(sql.SQL("DROP POLICY IF EXISTS app_lecture ON clean.{}").format(nom))
        connection.execute(
            sql.SQL("CREATE POLICY app_lecture ON clean.{} FOR SELECT TO {} USING (true)").format(
                nom, app_user
            )
        )
        connection.execute(sql.SQL("DROP POLICY IF EXISTS agent_assure ON clean.{}").format(nom))
        connection.execute(
            sql.SQL(
                "CREATE POLICY agent_assure ON clean.{} FOR SELECT TO {} USING (" + filtre + ")"
            ).format(nom, agent_user)
        )


def ensure_alert_threshold() -> None:
    with psycopg.connect(settings.psycopg_migrate_url) as connection:
        connection.execute(
            """
            INSERT INTO app.settings (key, value)
            VALUES ('alert_threshold', %s)
            ON CONFLICT (key) DO NOTHING
            """,
            (str(settings.alert_threshold),),
        )
        connection.execute(
            """
            INSERT INTO app.settings (key, value)
            VALUES ('retention_identites_years', %s)
            ON CONFLICT (key) DO NOTHING
            """,
            (str(settings.retention_identites_years),),
        )
        connection.execute(
            """
            INSERT INTO app.settings (key, value)
            VALUES ('notification_channels', 'webhook')
            ON CONFLICT (key) DO NOTHING
            """
        )
        connection.execute(
            """
            INSERT INTO app.settings (key, value)
            VALUES ('n8n_webhook_url', '')
            ON CONFLICT (key) DO NOTHING
            """
        )
        connection.execute(
            """
            INSERT INTO app.settings (key, value)
            VALUES ('drift_psi_threshold', %s)
            ON CONFLICT (key) DO NOTHING
            """,
            (str(settings.drift_psi_threshold),),
        )
        connection.commit()


def ensure_comptes() -> None:
    if not settings.auth_demo_password:
        logger.warning("comptes demo non crees")
        return
    assure_id = settings.auth_assure_id or None
    comptes = (
        ("prestataire", "prestataire", None),
        ("assure", "assure", assure_id),
        ("gestionnaire", "gestionnaire", None),
        ("administrateur", "administrateur", None),
    )
    mot = hacher(settings.auth_demo_password)
    with psycopg.connect(settings.psycopg_migrate_url) as connection:
        for identifiant, role, lien in comptes:
            connection.execute(
                """
                INSERT INTO app.utilisateurs (identifiant, mot_de_passe_hash, role, assure_id)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (identifiant) DO NOTHING
                """,
                (identifiant, mot, role, lien),
            )
        connection.commit()
    logger.info("comptes verifies n=%s", len(comptes))


def enregistrer_modeles() -> None:
    from psycopg.types.json import Json

    fiches = lister_fiches(Path(settings.models_dir))
    with psycopg.connect(settings.psycopg_migrate_url) as connection:
        for fiche in fiches:
            connection.execute(
                """
                INSERT INTO app.model_registry (
                    version, algorithme, seuil_metier, nb_colonnes, metriques, colonnes,
                    metadata_sha256, artefact_present, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, now())
                ON CONFLICT (version) DO UPDATE SET
                    algorithme = EXCLUDED.algorithme,
                    seuil_metier = EXCLUDED.seuil_metier,
                    nb_colonnes = EXCLUDED.nb_colonnes,
                    metriques = EXCLUDED.metriques,
                    colonnes = EXCLUDED.colonnes,
                    metadata_sha256 = EXCLUDED.metadata_sha256,
                    artefact_present = EXCLUDED.artefact_present,
                    updated_at = now()
                """,
                (
                    fiche.version,
                    fiche.algorithme,
                    fiche.seuil_metier,
                    len(fiche.colonnes),
                    Json(fiche.metriques),
                    Json(list(fiche.colonnes)),
                    fiche.metadata_sha256,
                    fiche.artefact_present,
                ),
            )
        connection.execute(
            """
            INSERT INTO app.settings (key, value)
            VALUES ('active_model_version', %s)
            ON CONFLICT (key) DO NOTHING
            """,
            (VERSION_SIMULEE,),
        )
        connection.commit()
    logger.info("registre modeles n=%s", len(fiches))


if __name__ == "__main__":
    main()
