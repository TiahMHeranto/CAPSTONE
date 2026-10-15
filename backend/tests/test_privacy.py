from app.privacy.admin import reidentifier
from app.privacy.crypto import (
    chiffrer,
    coffre_fernet,
    dechiffrer,
    detail_audit,
    pseudonyme,
    tranche_age,
)
from app.privacy.scan import localiser


class _Resultat:
    def __init__(self, ligne):
        self._ligne = ligne

    def fetchone(self):
        return self._ligne


class _Connexion:
    def __init__(self, charge):
        self.charge = charge
        self.audit = None

    def execute(self, requete, params=None):
        if "lire_charge" in requete:
            return _Resultat((self.charge,))
        if "audit_log" in requete:
            self.audit = params
            return _Resultat(None)
        raise AssertionError(requete)


def test_pseudonyme_stable() -> None:
    assert pseudonyme("ASSURE-1", "clef") == pseudonyme("ASSURE-1", "clef")
    assert pseudonyme("ASSURE-1", "clef") != pseudonyme("ASSURE-1", "autre")
    assert len(pseudonyme("ASSURE-1", "clef")) == 64


def test_chiffrement_roundtrip() -> None:
    fernet = coffre_fernet("change-me-pii")
    contenu = {"email": "personne@example.com", "nom": "Exemple"}
    charge = chiffrer(fernet, contenu)
    assert b"personne@example.com" not in charge
    assert dechiffrer(fernet, charge) == contenu


def test_tranche_age() -> None:
    assert tranche_age(2010, 2026) == "0-17"
    assert tranche_age(2000, 2026) == "18-39"
    assert tranche_age(1970, 2026) == "40-59"
    assert tranche_age(1950, 2026) == "60+"
    assert tranche_age(None, 2026) is None


def test_audit_sans_identite() -> None:
    fernet = coffre_fernet("change-me-pii")
    charge = chiffrer(fernet, {"nom": "NomSecret", "email": "secret@example.com"})
    connexion = _Connexion(charge)
    clair = reidentifier(connexion, "ab" * 32, "change-me-pii", "admin")
    assert clair["nom"] == "NomSecret"
    assert "NomSecret" not in " ".join(str(valeur) for valeur in connexion.audit)
    assert detail_audit("trouve") == '{"resultat": "trouve"}'


def test_scan_localise_une_colonne() -> None:
    assert localiser({"clean.assures.ville": {"Antananarivo"}}, {"Antananarivo"}) == [
        "clean.assures.ville"
    ]
    assert localiser({"clean.assures.ville": {"Antananarivo"}}, {"personne@example.com"}) == []
