import psycopg

from app.config import settings


def ouvrir() -> psycopg.Connection:
    return psycopg.connect(settings.psycopg_database_url, connect_timeout=3)
