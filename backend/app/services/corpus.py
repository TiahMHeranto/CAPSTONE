"""Indexation du corpus en arrière-plan. Les PDF restent hors de l'image."""

import logging
import threading
from pathlib import Path

from app.config import settings
from app.db.session import ouvrir

logger = logging.getLogger(__name__)

_verrou = threading.Lock()
_etat = {"statut": "repos", "fragments": 0, "message": ""}


def etat() -> dict:
    with _verrou:
        return dict(_etat)


def chemin_corpus() -> Path:
    try:
        with ouvrir() as connection:
            ligne = connection.execute(
                "SELECT value FROM app.settings WHERE key = 'rag_corpus_path'"
            ).fetchone()
    except Exception:
        logger.warning("lecture du chemin corpus impossible")
        return Path(settings.rag_dir)
    if ligne and ligne[0]:
        return Path(ligne[0])
    return Path(settings.rag_dir)


def destination(dossier: Path, relatif: str) -> Path | None:
    if not relatif or len(relatif) > 240 or not relatif.lower().endswith(".pdf"):
        return None
    parties = relatif.replace("\\", "/").split("/")
    morceaux = [morceau for morceau in parties if morceau not in ("", ".")]
    if not morceaux or any(morceau == ".." or "\x00" in morceau for morceau in morceaux):
        return None
    cible = dossier.joinpath(*morceaux)
    try:
        if not cible.resolve().is_relative_to(dossier.resolve()):
            return None
    except OSError:
        return None
    return cible


def deposer(morceaux: list[tuple[str, bytes]]) -> tuple[int, dict]:
    dossier = chemin_corpus()
    if not dossier.is_dir():
        return 422, {
            "valide": False,
            "rejets": [{"code": "CORPUS_ABSENT", "motif": "dossier du corpus introuvable"}],
        }
    with _verrou:
        if _etat["statut"] == "en_cours":
            return 409, {
                "code": "INDEXATION_EN_COURS",
                "motif": "une mise a jour du corpus est deja en cours",
            }
    ecrits = 0
    try:
        for relatif, contenu in morceaux:
            cible = destination(dossier, relatif)
            if cible is None or len(contenu) > 20 * 1024 * 1024:
                continue
            cible.parent.mkdir(parents=True, exist_ok=True)
            cible.write_bytes(contenu)
            ecrits += 1
    except OSError:
        logger.warning("ecriture du corpus refusee")
        return 422, {
            "valide": False,
            "rejets": [{"code": "CORPUS_ABSENT", "motif": "dossier du corpus non modifiable"}],
        }
    if ecrits == 0:
        return 422, {
            "valide": False,
            "rejets": [{"code": "FICHIER_INVALIDE", "motif": "aucun pdf retenu"}],
        }
    logger.info("pdf deposes compte=%s", ecrits)
    return lancer()


def lancer() -> tuple[int, dict]:
    dossier = chemin_corpus()
    if not dossier.is_dir():
        return 422, {
            "valide": False,
            "rejets": [{"code": "CORPUS_ABSENT", "motif": "dossier du corpus introuvable"}],
        }
    with _verrou:
        if _etat["statut"] == "en_cours":
            return 409, {
                "code": "INDEXATION_EN_COURS",
                "motif": "une mise a jour du corpus est deja en cours",
            }
        _etat.update(statut="en_cours", fragments=0, message="")
    threading.Thread(target=_travail, args=(dossier,), daemon=True, name="corpus").start()
    return 202, etat()


def indexer_si_vide() -> None:
    if not settings.rag_index_au_demarrage:
        return
    try:
        dossier = chemin_corpus()
        if not dossier.is_dir():
            logger.info("corpus non monte chemin=%s", dossier)
            return
        with ouvrir() as connection:
            compte = connection.execute("SELECT count(*) FROM app.documents").fetchone()
        if compte and compte[0] == 0:
            logger.info("corpus vide, indexation au demarrage")
            lancer()
    except Exception:
        logger.warning("indexation initiale non lancee", exc_info=True)


def _travail(dossier: Path) -> None:
    try:
        from app.rag.index import indexer

        total = indexer(dossier)
        with _verrou:
            _etat.update(statut="termine", fragments=total, message="")
        logger.info("corpus a jour fragments=%s", total)
    except Exception as exc:
        logger.warning("indexation echouee erreur=%s", type(exc).__name__)
        with _verrou:
            _etat.update(statut="echec", fragments=0, message=type(exc).__name__)
