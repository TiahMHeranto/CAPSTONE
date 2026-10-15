import logging

import psycopg

from app.config import settings

logger = logging.getLogger(__name__)


def database_ok() -> bool:
    try:
        with psycopg.connect(settings.psycopg_database_url, connect_timeout=3) as connection:
            connection.execute("SELECT 1")
        return True
    except Exception as exc:
        logger.warning("database health failed", extra={"error_type": type(exc).__name__})
        return False
