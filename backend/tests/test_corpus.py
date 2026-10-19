from pathlib import Path

from app.services.corpus import destination, etat, lancer
from app.services import corpus
from app.services.reglages import normaliser


def test_un_chemin_qui_sort_du_dossier_est_refuse(tmp_path: Path) -> None:
    assert destination(tmp_path, "../secret.pdf") is None
    assert destination(tmp_path, "notes.txt") is None
    assert destination(tmp_path, "contrats/CP.pdf") == tmp_path / "contrats" / "CP.pdf"
    _propres, rejets = normaliser({"rag_corpus_path": "corpus"})
    assert rejets[0].code == "REGLAGE_INVALIDE"


def test_un_dossier_existant_est_accepte(tmp_path: Path) -> None:
    propres, rejets = normaliser({"rag_corpus_path": str(tmp_path)})
    assert rejets == []
    assert Path(propres["rag_corpus_path"]) == tmp_path


def test_deuxieme_lancement_refuse(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(corpus, "chemin_corpus", lambda: tmp_path)
    monkeypatch.setattr(corpus, "_travail", lambda _dossier: None)
    corpus._etat.update(statut="repos", fragments=0, message="")
    statut, _corps = lancer()
    assert statut == 202
    assert etat()["statut"] == "en_cours"
    refus, corps = lancer()
    assert refus == 409
    assert corps["code"] == "INDEXATION_EN_COURS"
    corpus._etat.update(statut="repos", fragments=0, message="")
