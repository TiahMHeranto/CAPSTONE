from app.core.tokens import Principal
from app.services.comptes import annuaire, creer, factures_de, ordonnances_de, profil


class _Charge:
    identifiant = "admin"
    mot_de_passe = "mot-secret"
    role = "assure"
    assure_id = "pseudo-1"
    prestataire_id = None


class _Lignes:
    def __init__(self, lignes):
        self._lignes = lignes

    def fetchall(self):
        return self._lignes

    def fetchone(self):
        return self._lignes[0] if self._lignes else None


class _Base:
    def __init__(self):
        self.comptes = []
        self.audit = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def commit(self):
        return None

    def execute(self, requete, params=None):
        if "clean.assures" in requete and "SELECT 1" in requete:
            return _Lignes([(1,)] if params[0] == "pseudo-1" else [])
        if "clean.prestataires" in requete and "SELECT 1" in requete:
            return _Lignes([(1,)] if params[0] == "PRE-1" else [])
        if "WHERE identifiant = %s" in requete and "SELECT 1" in requete:
            return _Lignes([(1,)] if any(item[0] == params[0] for item in self.comptes) else [])
        if "INSERT INTO app.utilisateurs" in requete:
            self.comptes.append(params)
            return _Lignes([])
        if "creation_compte" in requete:
            self.audit.append(params)
            return _Lignes([])
        if "FROM clean.assures AS a" in requete:
            if params[0] != "pseudo-1":
                return _Lignes([])
            return _Lignes(
                [
                    (
                        "pseudo-1",
                        "F",
                        "Antananarivo",
                        "2024-01-01",
                        None,
                        "CTR-1",
                        "ESSENTIEL",
                        "ACTIF",
                        "2024-01-01",
                        None,
                    )
                ]
            )
        if "lire_charge" in requete:
            return _Lignes([(b"charge",)])
        if "action, entite" in requete and "'profil'" in requete:
            self.audit.append(params)
            return _Lignes([])
        if "FROM clean.prestataires" in requete:
            if params[0] != "PRE-1":
                return _Lignes([])
            return _Lignes([("PRE-1", "Pharmacie Exemple", "PHARMACIE", "Antananarivo", "ACTIF")])
        if "FROM clean.factures" in requete:
            return _Lignes([("FAC-1", "PAYEE", "PHARMACIE", 12000, "2026-01-02", "ORD-1")])
        if "FROM clean.ordonnances" in requete:
            return _Lignes([("ORD-1", "2026-01-01", 10, params[0])])
        raise AssertionError(requete)


def _brancher(monkeypatch):
    base = _Base()
    monkeypatch.setattr("app.services.comptes.ouvrir", lambda: base)
    return base


def test_assure_sans_pseudonyme_refuse(monkeypatch) -> None:
    _brancher(monkeypatch)
    charge = _Charge()
    charge.assure_id = None
    statut, corps = creer("admin", charge)
    assert statut == 422
    assert corps["code"] == "LIEN_REQUIS"


def test_gestionnaire_sans_lien(monkeypatch) -> None:
    base = _brancher(monkeypatch)
    charge = _Charge()
    charge.role = "gestionnaire"
    charge.assure_id = None
    statut, corps = creer("admin", charge)
    assert statut == 201
    assert corps["role"] == "gestionnaire"
    assert base.comptes[0][3] is None
    assert base.comptes[0][4] is None


def test_assure_rattache_puis_profil_sans_cin(monkeypatch) -> None:
    _brancher(monkeypatch)
    monkeypatch.setattr(
        "app.services.comptes.dechiffrer",
        lambda *_args: {
            "nom": "Rabe",
            "prenoms": "Aina",
            "numero_cin": "000",
            "email": "a@exemple.mg",
        },
    )
    charge = _Charge()
    assert creer("admin", charge)[0] == 201
    statut, corps = profil(Principal("compte-assure", "assure", "pseudo-1"))
    assert statut == 200
    assert corps["nom"] == {"nom": "Rabe", "prenoms": "Aina"}
    assert "numero_cin" not in corps["nom"]
    assert corps["contrat"]["formule"] == "ESSENTIEL"
    factures = factures_de(Principal("compte-assure", "assure", "pseudo-1"))
    assert factures[1]["factures"][0]["facture_id"] == "FAC-1"
    ordonnances = ordonnances_de(Principal("compte-assure", "assure", "pseudo-1"))
    assert ordonnances[1]["ordonnances"][0]["ordonnance_id"] == "ORD-1"


def test_prestataire_voit_ses_pieces(monkeypatch) -> None:
    _brancher(monkeypatch)
    charge = _Charge()
    charge.role = "prestataire"
    charge.assure_id = None
    charge.prestataire_id = "PRE-1"
    assert creer("admin", charge)[0] == 201
    statut, corps = profil(Principal("pharma", "prestataire", None, "PRE-1"))
    assert statut == 200
    assert corps["nom"] == "Pharmacie Exemple"
    assert corps["type"] == "PHARMACIE"
    assert factures_de(Principal("pharma", "prestataire", None, "PRE-1"))[1]["factures"]
    assert ordonnances_de(Principal("autre", "prestataire", None))[1]["ordonnances"] == []


def test_annuaire_assure_affiche_le_nom(monkeypatch) -> None:
    class Base:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, requete, _params=None):
            if "lire_annuaire" in requete:
                return _Lignes([("pseudo-1", b"charge")])
            if "FROM clean.assures" in requete:
                return _Lignes([("pseudo-1", "Toamasina", "ENFANT")])
            raise AssertionError(requete)

    monkeypatch.setattr("app.services.comptes.ouvrir", lambda: Base())
    monkeypatch.setattr(
        "app.services.comptes.dechiffrer",
        lambda *_args: {"nom": "Rabe", "prenoms": "Aina", "numero_cin": "000"},
    )
    statut, corps = annuaire("assure")
    assert statut == 200
    personne = corps["personnes"][0]
    assert personne["nom"] == "Aina Rabe"
    assert personne["assure_id"] == "pseudo-1"
    assert "numero_cin" not in personne


def test_creation_http_reservee_a_l_admin(client, entete) -> None:
    response = client.post(
        "/admin/utilisateurs",
        headers=entete("gestionnaire"),
        json={
            "identifiant": "nouveau",
            "mot_de_passe": "mot-secret",
            "role": "gestionnaire",
        },
    )
    assert response.status_code == 403
