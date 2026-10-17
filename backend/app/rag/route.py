"""Choisit la source avant la recherche.

Le modèle ne décide pas. Les mots de la question choisissent le dossier SQL,
les contrats PDF, ou les deux. L'identifiant lu ensuite vient du jeton.
"""

from app.rag.glossaire import _motif, norm

_DOSSIER = (
    "facture",
    "factures",
    "historique",
    "remboursement",
    "remboursements",
    "payee",
    "rejetee",
    "date de soin",
    "dernier soin",
    "ou en est",
)
_CONTRAT = (
    "plafond",
    "carence",
    "formule",
    "garantie",
    "garanties",
    "reseau",
    "exclusion",
    "optique",
    "dentaire",
    "maternite",
    "bareme",
    "delai",
    "ordonnance",
    "justificatif",
    "a fournir",
    "ticket moderateur",
    "entente",
    "conditions",
    "taux",
)


def _present(texte: str, termes: tuple[str, ...]) -> bool:
    return any(_motif(terme).search(texte) for terme in termes)


def intention(question: str) -> str:
    normalise = norm(question)
    dossier = _present(normalise, _DOSSIER)
    contrat = _present(normalise, _CONTRAT)
    if dossier and contrat:
        return "les_deux"
    if dossier:
        return "dossier"
    return "contrat"
