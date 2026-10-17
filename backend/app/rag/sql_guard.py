"""Valide une requête avant de la confier au rôle lecture seule.

Le modèle propose le SQL. Seul un SELECT sur les vues du dossier passe,
avec un plafond de lignes. Un identifiant de compte écrit dans la requête
est refusé : la session l'impose déjà.
"""

import json
import re
from pathlib import Path

import sqlglot
from sqlglot import exp
from sqlglot.errors import ParseError

from app.rag.glossaire import norm

_DOSSIER = Path(__file__).resolve().parent
LIMITE_LIGNES = 50
_IDENTIFIANT = re.compile(r"'(ASS|PRE|CTR)-", re.IGNORECASE)
_RACINES = (exp.Select, exp.Union, exp.Intersect, exp.Except)
_INTERDITS = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Drop,
    exp.Alter,
    exp.Create,
    exp.Command,
    exp.Merge,
    exp.Grant,
)
_AGREGATS = (exp.Count, exp.Sum, exp.Avg, exp.Min, exp.Max)


class RequeteRefusee(Exception):
    pass


def _charger(nom: str):
    return json.loads((_DOSSIER / nom).read_text(encoding="utf-8"))


_TABLES = _charger("schema_dossier.json")["tables"]
_EXEMPLES = _charger("exemples_sql.json")
_COLONNES = {
    colonne["nom"]
    for table in _TABLES
    for colonne in table["colonnes"]
}
_NOMS = {}
for _table in _TABLES:
    _schema, _nom = _table["nom"].split(".", 1)
    _NOMS[(_schema, _nom)] = _table


def texte_schema() -> str:
    lignes = []
    for table in _TABLES:
        lignes.append(f"{table['nom']}: {table['description']}")
        for colonne in table["colonnes"]:
            valeurs = colonne.get("valeurs")
            suite = f" Valeurs: {', '.join(valeurs)}." if valeurs else ""
            lignes.append(
                f"- {colonne['nom']} ({colonne['type']}): {colonne['description']}{suite}"
            )
    return "\n".join(lignes)


def exemples_proches(question: str, nombre: int = 4) -> str:
    mots = set(norm(question).split())
    notes = []
    for exemple in _EXEMPLES:
        communs = mots & set(norm(exemple["question"]).split())
        notes.append((len(communs), exemple))
    notes.sort(key=lambda item: item[0], reverse=True)
    return "\n\n".join(
        f"Question: {exemple['question']}\n{exemple['sql']}"
        for _note, exemple in notes[:nombre]
    )


def exemples() -> list[dict]:
    return list(_EXEMPLES)


def valider(requete: str) -> str:
    try:
        arbres = sqlglot.parse(requete, read="postgres")
    except ParseError as exc:
        raise RequeteRefusee("sql illisible") from exc
    if len(arbres) != 1 or arbres[0] is None:
        raise RequeteRefusee("une seule requete")
    arbre = arbres[0]
    if not isinstance(arbre, _RACINES):
        raise RequeteRefusee("select uniquement")
    for noeud in arbre.walk():
        if isinstance(noeud, _INTERDITS):
            raise RequeteRefusee("select uniquement")
        if isinstance(noeud, exp.Anonymous):
            raise RequeteRefusee("fonction interdite")
    _tables(arbre)
    _colonnes(arbre)
    _etoiles(arbre)
    sql = _plafonner(arbre).sql(dialect="postgres")
    if _IDENTIFIANT.search(sql):
        raise RequeteRefusee("identifiant de compte interdit")
    return sql


def _tables(arbre: exp.Expression) -> None:
    alias = set()
    for cte in arbre.find_all(exp.CTE):
        alias.add(cte.alias.lower())
    for sous_requete in arbre.find_all(exp.Subquery):
        nom = _nom_alias(sous_requete.args.get("alias"))
        if nom:
            alias.add(nom)
    for table in arbre.find_all(exp.Table):
        nom = table.name.lower()
        if not table.db and nom in alias:
            continue
        if (table.db.lower(), nom) not in _NOMS:
            raise RequeteRefusee("table interdite")


def _colonnes(arbre: exp.Expression) -> None:
    alias = set()
    for noeud in arbre.find_all(exp.Alias):
        if isinstance(noeud.alias, str):
            alias.add(noeud.alias.lower())
    for colonne in arbre.find_all(exp.Column):
        if colonne.name.lower() not in _COLONNES and colonne.name.lower() not in alias:
            raise RequeteRefusee("colonne interdite")


def _etoiles(arbre: exp.Expression) -> None:
    for etoile in arbre.find_all(exp.Star):
        if not isinstance(etoile.parent, _AGREGATS):
            raise RequeteRefusee("select etoile interdit")


def _plafonner(arbre: exp.Expression) -> exp.Expression:
    limite = arbre.args.get("limit")
    if limite is None:
        return arbre.limit(LIMITE_LIGNES)
    expression = limite.expression
    if isinstance(expression, exp.Literal) and expression.is_int:
        if int(expression.this) > LIMITE_LIGNES:
            arbre.set("limit", exp.Limit(expression=exp.Literal.number(LIMITE_LIGNES)))
    return arbre


def _nom_alias(valeur) -> str:
    if isinstance(valeur, str):
        return valeur.lower()
    if valeur is None:
        return ""
    return str(getattr(valeur, "name", "") or "").lower()
