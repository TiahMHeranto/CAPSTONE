from app.core.tokens import Principal, hacher, verifier
from app.services.comptes import changer_mot_de_passe


class _Charge:
    def __init__(self, actuel: str, nouveau: str, confirmation: str) -> None:
        self.actuel = actuel
        self.nouveau = nouveau
        self.confirmation = confirmation


class _Lignes:
    def __init__(self, lignes):
        self._lignes = lignes

    def fetchone(self):
        return self._lignes[0] if self._lignes else None


class _Base:
    def __init__(self, stocke: str | None) -> None:
        self.stocke = stocke
        self.maj = None
        self.audit = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def commit(self):
        return None

    def execute(self, requete, params=None):
        if "SELECT mot_de_passe_hash" in requete:
            return _Lignes([] if self.stocke is None else [(self.stocke,)])
        if "SET mot_de_passe_hash" in requete:
            self.maj = params
            return _Lignes([])
        if "changement_mot_de_passe" in requete:
            self.audit.append(params)
            return _Lignes([])
        raise AssertionError(requete)


def _brancher(monkeypatch, stocke: str | None) -> _Base:
    base = _Base(stocke)
    monkeypatch.setattr("app.services.comptes.ouvrir", lambda: base)
    return base


def test_changement_accepte(monkeypatch) -> None:
    base = _brancher(monkeypatch, hacher("actuel-secret"))
    statut, corps = changer_mot_de_passe(
        Principal("gestionnaire", "gestionnaire", None),
        _Charge("actuel-secret", "nouveau-secret", "nouveau-secret"),
    )
    assert statut == 200
    assert corps["identifiant"] == "gestionnaire"
    assert base.maj is not None
    assert verifier("nouveau-secret", base.maj[0])
    assert base.audit


def test_actuel_refuse(monkeypatch) -> None:
    base = _brancher(monkeypatch, hacher("actuel-secret"))
    statut, corps = changer_mot_de_passe(
        Principal("assure", "assure", "pseudo-1"),
        _Charge("mauvais", "nouveau-secret", "nouveau-secret"),
    )
    assert statut == 422
    assert corps["code"] == "MOT_ACTUEL_REFUSE"
    assert base.maj is None


def test_confirmation_differente(monkeypatch) -> None:
    base = _brancher(monkeypatch, hacher("actuel-secret"))
    statut, corps = changer_mot_de_passe(
        Principal("admin", "administrateur", None),
        _Charge("actuel-secret", "nouveau-secret", "autre-secret"),
    )
    assert statut == 422
    assert corps["code"] == "MOT_DIFFERENT"
    assert base.maj is None


def test_nouveau_identique(monkeypatch) -> None:
    base = _brancher(monkeypatch, hacher("actuel-secret"))
    statut, corps = changer_mot_de_passe(
        Principal("pharma", "prestataire", None, "PRE-1"),
        _Charge("actuel-secret", "actuel-secret", "actuel-secret"),
    )
    assert statut == 422
    assert corps["code"] == "MOT_IDENTIQUE"
    assert base.maj is None


def test_compte_absent(monkeypatch) -> None:
    _brancher(monkeypatch, None)
    statut, corps = changer_mot_de_passe(
        Principal("parti", "gestionnaire", None),
        _Charge("actuel-secret", "nouveau-secret", "nouveau-secret"),
    )
    assert statut == 422
    assert corps["code"] == "MOT_ACTUEL_REFUSE"
