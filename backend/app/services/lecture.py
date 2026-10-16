"""Lecture seule, isolée des dépôts et du score.

Le compte de l'API lit app, clean et bi. raw, labels et identites
restent fermés : cette route ne change pas ces droits.
"""

import logging
import re
from datetime import date, datetime
from decimal import Decimal

import psycopg
from psycopg import sql

from app.db.session import ouvrir

logger = logging.getLogger(__name__)

SCHEMAS = ("app", "clean", "bi")
_NOM = re.compile(r"^[a-z][a-z0-9_]{0,62}$")
_MASQUES = frozenset({"mot_de_passe_hash"})


def nom_valide(valeur: str) -> bool:
    return _NOM.fullmatch(valeur) is not None


def catalogue() -> tuple[int, dict]:
    try:
        with ouvrir() as connection:
            relations = _relations(connection)
            comptes = _compter(connection, relations)
    except psycopg.Error as exc:
        logger.warning("lecture catalogue erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    for ligne in relations:
        ligne["nb"] = comptes.get(f"{ligne['schema']}.{ligne['nom']}", 0)
    return 200, {"relations": relations}


def lire(schema: str, table: str, limit: int, offset: int) -> tuple[int, dict]:
    if schema not in SCHEMAS or not nom_valide(table):
        return 404, {"code": "RELATION_INCONNUE", "motif": "relation illisible"}
    try:
        with ouvrir() as connection:
            colonnes = _colonnes(connection, schema, table)
            if not colonnes:
                return 404, {"code": "RELATION_INCONNUE", "motif": "relation illisible"}
            total = _total(connection, schema, table)
            lignes = _lignes(connection, schema, table, colonnes, limit, offset)
    except psycopg.Error as exc:
        logger.warning("lecture table erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {
        "schema": schema,
        "table": table,
        "total": total,
        "limit": limit,
        "offset": offset,
        "colonnes": [nom for nom, _udt in colonnes],
        "lignes": lignes,
    }


def _relations(connection) -> list[dict]:
    rows = connection.execute(
        """
        SELECT table_schema, table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = ANY(%s)
        ORDER BY table_schema, table_name
        """,
        (list(SCHEMAS),),
    ).fetchall()
    return [
        {
            "schema": row[0],
            "nom": row[1],
            "genre": "vue" if row[2] == "VIEW" else "table",
        }
        for row in rows
        if nom_valide(row[0]) and nom_valide(row[1])
    ]


def _compter(connection, relations: list[dict]) -> dict[str, int]:
    if not relations:
        return {}
    parties = [
        sql.SQL("SELECT {} AS cle, count(*)::bigint AS nb FROM {}.{}").format(
            sql.Literal(f"{ligne['schema']}.{ligne['nom']}"),
            sql.Identifier(ligne["schema"]),
            sql.Identifier(ligne["nom"]),
        )
        for ligne in relations
    ]
    requete = sql.SQL(" UNION ALL ").join(parties)
    comptes = {}
    for cle, nb in connection.execute(requete).fetchall():
        comptes[cle] = int(nb)
    return comptes


def _colonnes(connection, schema: str, table: str) -> list[tuple[str, str]]:
    rows = connection.execute(
        """
        SELECT column_name, udt_name
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        ORDER BY ordinal_position
        """,
        (schema, table),
    ).fetchall()
    return [(row[0], row[1]) for row in rows if nom_valide(row[0])]


def _total(connection, schema: str, table: str) -> int:
    requete = sql.SQL("SELECT count(*)::bigint FROM {}.{}").format(
        sql.Identifier(schema),
        sql.Identifier(table),
    )
    return int(connection.execute(requete).fetchone()[0])


def _lignes(connection, schema: str, table: str, colonnes, limit: int, offset: int) -> list[dict]:
    expressions = [_expression(nom, udt) for nom, udt in colonnes]
    ordre = next((nom for nom, udt in colonnes if udt != "vector"), None)
    requete = sql.SQL("SELECT {} FROM {}.{}{} LIMIT %s OFFSET %s").format(
        sql.SQL(", ").join(expressions),
        sql.Identifier(schema),
        sql.Identifier(table),
        sql.SQL(" ORDER BY {}").format(sql.Identifier(ordre)) if ordre else sql.SQL(""),
    )
    rows = connection.execute(requete, (limit, offset)).fetchall()
    noms = [nom for nom, _udt in colonnes]
    return [{nom: _valeur(row[index]) for index, nom in enumerate(noms)} for row in rows]


def _expression(nom: str, udt: str):
    if nom in _MASQUES:
        return sql.SQL("{} AS {}").format(sql.Literal("[masque]"), sql.Identifier(nom))
    if udt == "vector":
        return sql.SQL("{} AS {}").format(sql.Literal("[vecteur]"), sql.Identifier(nom))
    return sql.Identifier(nom)


def _valeur(valeur: object) -> object:
    if valeur is None or isinstance(valeur, (str, int, float, bool)):
        return valeur
    if isinstance(valeur, (datetime, date)):
        return valeur.isoformat()
    if isinstance(valeur, Decimal):
        return str(valeur)
    if isinstance(valeur, (bytes, memoryview)):
        return "[binaire]"
    if isinstance(valeur, (dict, list)):
        return valeur
    return str(valeur)
