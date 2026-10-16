"""Indexe les PDF du corpus dans app.documents."""

import logging
from pathlib import Path

from pypdf import PdfReader

from app.config import settings
from app.db.session import ouvrir
from app.rag.chunks import contrat_de, decouper
from app.services.assistant import embarquer

logger = logging.getLogger(__name__)


def indexer(dossier: Path) -> int:
    fichiers = sorted(dossier.rglob("*.pdf"))
    total = 0
    with ouvrir() as connection:
        for fichier in fichiers:
            total += _fichier(connection, fichier)
        connection.commit()
    logger.info("corpus indexe fragments=%s", total)
    return total


def _fichier(connection, fichier: Path) -> int:
    source = fichier.name
    connection.execute("DELETE FROM app.documents WHERE source = %s", (source,))
    contrat = contrat_de(source)
    lecteur = PdfReader(str(fichier))
    compte = 0
    for numero, page in enumerate(lecteur.pages, start=1):
        for fragment, morceau in enumerate(decouper(page.extract_text() or "")):
            vecteur = embarquer(f"{source} page {numero}. {morceau}")
            connection.execute(
                """
                INSERT INTO app.documents
                    (source, page, fragment, contrat_id, contenu, embedding)
                VALUES (%s, %s, %s, %s, %s, %s::vector)
                """,
                (
                    source,
                    numero,
                    fragment,
                    contrat,
                    morceau,
                    "[" + ",".join(f"{valeur:.6f}" for valeur in vecteur) + "]",
                ),
            )
            compte += 1
    return compte


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    dossier = Path(settings.rag_dir)
    if not dossier.is_dir():
        raise SystemExit(f"corpus absent: {dossier}")
    print(indexer(dossier))


if __name__ == "__main__":
    main()
