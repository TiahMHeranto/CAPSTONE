import psycopg

from app.config import settings


def ouvrir() -> psycopg.Connection:
    return psycopg.connect(settings.psycopg_database_url, connect_timeout=3)


def ouvrir_agent() -> psycopg.Connection:
    return psycopg.connect(
        settings.psycopg_agent_url,
        connect_timeout=3,
        options=f"-c statement_timeout={int(settings.agent_statement_timeout_ms)}",
    )
