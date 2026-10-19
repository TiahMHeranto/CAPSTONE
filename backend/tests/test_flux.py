import hashlib
import inspect
import json
from pathlib import Path

from app.config import settings
from app.core.tokens import emettre, hacher, lire_jeton, verifier
from app.privacy.crypto import pseudonyme
from app.schemas.prediction import Contribution, Prediction
from app.services import flux, metrics, notify, reglages
from app.services.inference import predict as predict_reel
from app.services.registry import ModeleIndisponible


class Lignes:
    def __init__(self, lignes):
        self._lignes = lignes

    def fetchall(self):
        return self._lignes

    def fetchone(self):
        return self._lignes[0] if self._lignes else None

    def __iter__(self):
        return iter(self._lignes)


def _texte(valeur):
    if hasattr(valeur, "isoformat"):
        return valeur.isoformat()
    return valeur


class Memoire:
    def __init__(self):
        self.settings = {
            "alert_threshold": "0",
            "active_model_version": "v2",
            "notification_channels": "webhook",
            "n8n_webhook_url": "",
        }
        self.factures = {}
        self.predictions = []
        self.shap = []
        self.decisions = []
        self.audit = []
        self.assures = set()
        self.committed = False
        self._id = 0

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def commit(self):
        self.committed = True

    def execute(self, requete, params=None):
        texte = " ".join(requete.split())
        params = params or ()
        if "tarif_max" in texte:
            return Lignes([])
        if "clean.referentiel_actes" in texte:
            return Lignes([("CONS-GEN",)])
        if "clean.referentiel_medicaments" in texte:
            return Lignes([])
        if "UNION ALL" in texte and "clean.assures" in texte:
            return Lignes([(1,)] if params[0] in self.assures else [])
        if "FROM app.settings" in texte and texte.startswith("SELECT"):
            cles = params[0]
            return Lignes([(cle, self.settings[cle]) for cle in cles if cle in self.settings])
        if "INSERT INTO app.settings" in texte:
            self.settings[params[0]] = params[1]
            return Lignes([])
        if "INSERT INTO app.audit_log" in texte:
            self.audit.append(params)
            return Lignes([])
        if "INSERT INTO app.factures" in texte:
            self.factures[params[0]] = {
                "facture_id": params[0],
                "assure_id": params[2],
                "type_facture": params[4],
                "date_soin": params[5],
                "date_facture": params[6],
                "devise": params[10],
                "montant_total": params[12],
                "statut": params[13],
                "soumis_par": params[14],
            }
            return Lignes([])
        if "INSERT INTO app.lignes_facture" in texte:
            return Lignes([])
        if "INSERT INTO app.predictions" in texte:
            self._id += 1
            self.predictions.append(
                {
                    "id": self._id,
                    "facture_id": params[0],
                    "score": params[1],
                    "classe": params[2],
                    "model_version": params[3],
                    "duree_ms": params[4],
                }
            )
            return Lignes([(self._id,)])
        if "INSERT INTO app.shap_explanations" in texte:
            self.shap.append(params)
            return Lignes([])
        if "INSERT INTO app.decisions" in texte:
            self.decisions.append(
                {"facture_id": params[0], "decision": params[3], "motif": params[4]}
            )
            return Lignes([])
        if "UPDATE app.factures" in texte:
            self.factures[params[2]]["statut"] = params[0]
            return Lignes([])
        if "SELECT 1 FROM app.factures" in texte:
            return Lignes([(1,)] if params[0] in self.factures else [])
        if "FROM app.factures AS f" in texte:
            return Lignes(
                [
                    (
                        facture["facture_id"],
                        facture["statut"],
                        facture["montant_total"],
                        _texte(facture["date_soin"]),
                    )
                    for facture in self.factures.values()
                    if facture["assure_id"] == params[0]
                ]
            )
        if "date_soin::text" in texte:
            facture = self.factures.get(params[0])
            if facture is None:
                return Lignes([])
            return Lignes(
                [
                    (
                        facture["facture_id"],
                        facture["statut"],
                        facture["montant_total"],
                        facture["devise"],
                        facture["type_facture"],
                        _texte(facture["date_soin"]),
                        _texte(facture["date_facture"]),
                        facture["assure_id"],
                        facture["soumis_par"],
                    )
                ]
            )
        if "SELECT id FROM app.predictions" in texte:
            trouves = [item for item in self.predictions if item["facture_id"] == params[0]]
            return Lignes([] if not trouves else [(trouves[-1]["id"],)])
        if "SELECT id, score" in texte:
            trouves = [item for item in self.predictions if item["facture_id"] == params[0]]
            if not trouves:
                return Lignes([])
            item = trouves[-1]
            return Lignes([(item["id"], item["score"], item["classe"], item["model_version"])])
        if "score::float, classe" in texte:
            trouves = [item for item in self.predictions if item["facture_id"] == params[0]]
            if not trouves:
                return Lignes([])
            item = trouves[-1]
            return Lignes([(item["score"], item["classe"], item["model_version"])])
        if "FROM app.shap_explanations" in texte:
            lignes = [
                (ligne[2], ligne[3], ligne[4]) for ligne in self.shap if ligne[0] == params[0]
            ]
            return Lignes(lignes)
        if "FROM app.decisions" in texte and "SELECT decision" in texte:
            trouves = [item for item in self.decisions if item["facture_id"] == params[0]]
            if not trouves:
                return Lignes([])
            item = trouves[-1]
            return Lignes([(item["decision"], item["motif"])])
        if "clean.ordonnances WHERE ordonnance_id" in texte:
            return Lignes([])
        if "anomalies_prescription" in texte:
            return Lignes([])
        if "diagnostic_incompatible" in texte:
            return Lignes([(False,)])
        if "clean.ordonnance_lignes" in texte:
            return Lignes([])
        if "classe = 'alerte'" in texte:
            closes = {item["facture_id"] for item in self.decisions}
            derniers = {}
            for item in self.predictions:
                derniers[item["facture_id"]] = item
            return Lignes(
                [
                    (item["facture_id"], item["score"], item["model_version"], "2026-10-15")
                    for item in derniers.values()
                    if item["classe"] == "alerte" and item["facture_id"] not in closes
                ]
            )
        if texte.startswith("SELECT"):
            return Lignes([])
        raise AssertionError(texte)


def _predire(facture_id, alert_threshold, version="v2", models_dir="models", variables=None):
    del models_dir, variables
    score = _score(facture_id)
    return Prediction(
        facture_id=facture_id,
        score=score,
        classe="alerte" if score >= alert_threshold else "normale",
        model_version=version,
        explications=[
            Contribution(variable="montant_total", contribution=score, libelle="Montant")
        ],
    )


def _brancher(monkeypatch, memoire=None):
    base = memoire or Memoire()
    monkeypatch.setattr("app.db.session.psycopg.connect", lambda *_args, **_kwargs: base)
    monkeypatch.setattr("app.services.flux.predict", _predire)
    return base


def _facture(identifiant="FAC-OK", montant=19000, **extra):
    corps = {
        "facture_id": identifiant,
        "type_facture": "CONSULTATION",
        "date_soin": "2024-11-11",
        "date_facture": "2024-11-12",
        "montant_total": montant,
        "lignes": [
            {
                "code": "CONS-GEN",
                "type_ligne": "ACTE",
                "quantite": 1,
                "prix_unitaire": montant,
                "montant": montant,
            }
        ],
    }
    corps.update(extra)
    return corps


def _score(identifiant: str) -> float:
    digest = hashlib.sha256(identifiant.encode()).hexdigest()
    return round(int(digest[:8], 16) / 0xFFFFFFFF, 6)


def _identifiant_sous_moitie() -> str:
    return next(f"FAC-S{index}" for index in range(80) if _score(f"FAC-S{index}") < 0.5)


def test_jeton_aller_retour() -> None:
    jeton = emettre("prestataire", "prestataire", None)
    principal = lire_jeton(f"Bearer {jeton}")
    assert principal is not None
    assert principal.role == "prestataire"
    assert lire_jeton(f"Bearer {jeton}x") is None
    expire = emettre("prestataire", "prestataire", None, duree_s=-10)
    assert lire_jeton(f"Bearer {expire}") is None


def test_mot_de_passe_verifier() -> None:
    stocke = hacher("secret-demo")
    assert verifier("secret-demo", stocke)
    assert not verifier("autre", stocke)


def test_seuil_non_fige_dans_le_flux() -> None:
    for module in (flux, reglages, metrics, notify):
        assert "0.8" not in inspect.getsource(module)


def test_soumission_refusee_sans_role(client, entete) -> None:
    assert client.post("/invoices", json=_facture()).status_code == 401
    response = client.post(
        "/invoices", json=_facture(), headers=entete("assure", assure_id="ASS-1")
    )
    assert response.status_code == 403
    assert response.json()["code"] == "ROLE_REFUSE"


def test_facture_valide_scoree_avec_le_seuil_en_base(client, monkeypatch, entete) -> None:
    memoire = _brancher(monkeypatch)
    identifiant = _identifiant_sous_moitie()
    response = client.post("/invoices", json=_facture(identifiant), headers=entete())
    assert response.status_code == 200
    body = response.json()
    assert body["valide"] is True
    assert body["prediction"]["model_version"] == "v2"
    assert body["prediction"]["classe"] == "alerte"
    assert body["notifie"] is False
    assert memoire.committed
    assert memoire.predictions[0]["duree_ms"] is not None
    assert memoire.shap


def test_facture_invalide_audit_sans_score(client, monkeypatch, entete) -> None:
    memoire = _brancher(monkeypatch)

    def interdit(*_args, **_kwargs):
        raise AssertionError("une facture invalide ne se score pas")

    monkeypatch.setattr("app.services.flux.predict", interdit)
    response = client.post(
        "/invoices",
        json=_facture("FAC-NEG", montant=-5),
        headers=entete(),
    )
    assert response.status_code == 422
    assert response.json()["rejets"][0]["code"] == "MONTANT_NEGATIF"
    assert memoire.predictions == []
    assert memoire.audit[0][1] == "rejet_facture"


def test_assure_imprime_devient_pseudonyme(client, monkeypatch, entete) -> None:
    memoire = _brancher(monkeypatch)
    brut = "ASS-IMPRIME"
    attendu = pseudonyme(brut, settings.pseudo_hmac_key)
    memoire.assures.add(attendu)
    response = client.post(
        "/invoices",
        json=_facture("FAC-PSEUDO", assure_id=brut),
        headers=entete(),
    )
    assert response.status_code == 200
    assert memoire.factures["FAC-PSEUDO"]["assure_id"] == attendu


def test_reference_inconnue(client, monkeypatch, entete) -> None:
    memoire = _brancher(monkeypatch)
    response = client.post(
        "/invoices",
        json=_facture("FAC-REF", assure_id="ASS-INCONNU"),
        headers=entete(),
    )
    assert response.status_code == 422
    assert response.json()["rejets"][0]["code"] == "REFERENCE_INCONNUE"
    assert memoire.factures == {}


def test_doublon(client, monkeypatch, entete) -> None:
    _brancher(monkeypatch)
    headers = entete()
    assert client.post("/invoices", json=_facture(), headers=headers).status_code == 200
    second = client.post("/invoices", json=_facture(), headers=headers)
    assert second.status_code == 409
    assert second.json()["code"] == "DOUBLON"


def test_lot_melange(client, monkeypatch, entete) -> None:
    _brancher(monkeypatch)
    response = client.post(
        "/invoices/batch",
        headers=entete(),
        json={"factures": [_facture("FAC-LOT-OK"), _facture("FAC-LOT-NEG", montant=-5)]},
    )
    assert response.status_code == 200
    resultats = response.json()["resultats"]
    assert resultats[0]["statut_http"] == 200
    assert resultats[0]["prediction"]["model_version"] == "v2"
    assert resultats[1]["statut_http"] == 422
    assert resultats[1]["valide"] is False


def test_v2_recoit_les_variables(client, monkeypatch, entete) -> None:
    memoire = _brancher(monkeypatch)
    memoire.settings["active_model_version"] = "v2"
    vus = {}

    def faux_predict(
        facture_id, alert_threshold, version="v2", models_dir="models", variables=None
    ):
        vus["version"] = version
        vus["variables"] = variables
        return Prediction(
            facture_id=facture_id,
            score=0.1,
            classe="normale" if 0.1 < alert_threshold else "alerte",
            model_version=version,
            explications=[
                Contribution(variable="montant_total", contribution=0.1, libelle="essai")
            ],
        )

    monkeypatch.setattr("app.services.flux.predict", faux_predict)
    response = client.post("/invoices", json=_facture("FAC-V2"), headers=entete())
    assert response.status_code == 200
    assert vus["version"] == "v2"
    assert vus["variables"]["montant_total"] == 19000
    assert response.json()["prediction"]["model_version"] == "v2"

    memoire.settings["active_model_version"] = "absente"
    monkeypatch.setattr("app.services.flux.predict", predict_reel)
    retour = client.post("/invoices", json=_facture("FAC-RETOUR"), headers=entete())
    assert retour.status_code == 503
    assert retour.json()["code"] == "MODELE_INDISPONIBLE"


def test_modele_indisponible(client, monkeypatch, entete) -> None:
    memoire = _brancher(monkeypatch)
    memoire.settings["active_model_version"] = "v2"

    def absent(*_args, **_kwargs):
        raise ModeleIndisponible("v2")

    monkeypatch.setattr("app.services.flux.predict", absent)
    response = client.post("/invoices", json=_facture("FAC-ABS"), headers=entete())
    assert response.status_code == 503
    assert response.json()["code"] == "MODELE_INDISPONIBLE"
    assert memoire.factures == {}
    assert memoire.audit[0][1] == "score_indisponible"


def test_alerte_appelle_le_webhook(client, monkeypatch, entete) -> None:
    memoire = _brancher(monkeypatch)
    memoire.settings["n8n_webhook_url"] = "http://n8n.test/hook"
    appels = []

    def faux(url, corps):
        appels.append((url, corps))
        return True

    monkeypatch.setattr("app.services.flux.notifier", faux)
    response = client.post("/invoices", json=_facture(_identifiant_sous_moitie()), headers=entete())
    assert response.status_code == 200
    assert response.json()["notifie"] is True
    assert appels[0][0] == "http://n8n.test/hook"
    assert appels[0][1]["assure_id"] == ""
    assert "nom" not in appels[0][1]


def test_lecture_reservee_au_deposant_puis_decision(client, monkeypatch, entete) -> None:
    memoire = _brancher(monkeypatch)
    memoire.settings["alert_threshold"] = "1"
    assert client.post("/invoices", json=_facture("FAC-LU"), headers=entete()).status_code == 200
    interdit = client.get("/invoices/FAC-LU", headers=entete("prestataire", identifiant="autre"))
    assert interdit.status_code == 404
    assure = client.get("/invoices/FAC-LU", headers=entete("assure", assure_id="ASS-1"))
    assert assure.status_code == 404
    lecture = client.get("/invoices/FAC-LU", headers=entete())
    assert lecture.status_code == 200
    assert lecture.json()["classe"] == "normale"
    assert lecture.json()["model_version"] == "v2"
    shap = client.get("/predictions/FAC-LU", headers=entete())
    assert shap.status_code == 403
    rapport = client.get("/predictions/FAC-LU", headers=entete("gestionnaire"))
    assert rapport.status_code == 200
    assert rapport.json()["explications"]
    alertes = client.get("/alerts", headers=entete("gestionnaire"))
    assert alertes.status_code == 200
    assert alertes.json()["alertes"] == []
    decision = client.post(
        "/invoices/FAC-LU/decisions",
        headers=entete("gestionnaire"),
        json={"decision": "valider", "motif": "pieces conformes"},
    )
    assert decision.status_code == 200
    assert decision.json()["statut"] == "VALIDE"
    assert (
        client.post(
            "/invoices/FAC-LU/decisions",
            headers=entete(),
            json={"decision": "rejeter", "motif": "non"},
        ).status_code
        == 403
    )
    suivi = client.get("/invoices/FAC-LU", headers=entete("gestionnaire"))
    assert suivi.json()["statut"] == "VALIDE"
    assert suivi.json()["decision"]["decision"] == "valider"


def test_file_alerte_puis_decision(client, monkeypatch, entete) -> None:
    _brancher(monkeypatch)
    client.post("/invoices", json=_facture("FAC-ALR"), headers=entete())
    alertes = client.get("/alerts", headers=entete("gestionnaire"))
    assert [item["facture_id"] for item in alertes.json()["alertes"]] == ["FAC-ALR"]
    client.post(
        "/invoices/FAC-ALR/decisions",
        headers=entete("gestionnaire"),
        json={"decision": "complement", "motif": "ordonnance manquante"},
    )
    assert client.get("/alerts", headers=entete("gestionnaire")).json()["alertes"] == []


def test_remboursements_suivent_le_pseudonyme_du_jeton(client, monkeypatch, entete) -> None:
    memoire = _brancher(monkeypatch)
    memoire.assures.add("ASS-1")
    client.post(
        "/invoices",
        json=_facture("FAC-REM", assure_id="ASS-1"),
        headers=entete(),
    )
    vide = client.get("/me/remboursements", headers=entete("assure"))
    assert vide.status_code == 200
    assert vide.json()["remboursements"] == []
    propre = client.get("/me/remboursements", headers=entete("assure", assure_id="ASS-1"))
    assert [item["facture_id"] for item in propre.json()["remboursements"]] == ["FAC-REM"]
    assert client.get("/me/remboursements", headers=entete("gestionnaire")).status_code == 403


def test_reglages_audites(client, monkeypatch, entete) -> None:
    memoire = _brancher(monkeypatch)
    assert (
        client.patch(
            "/admin/settings",
            headers=entete("gestionnaire"),
            json={"alert_threshold": 0.2},
        ).status_code
        == 403
    )
    response = client.patch(
        "/admin/settings",
        headers={"X-Admin-Key": settings.admin_api_key},
        json={"alert_threshold": 0.2, "notification_channels": ["email", "webhook"]},
    )
    assert response.status_code == 200
    assert response.json()["alert_threshold"] == 0.2
    assert response.json()["notification_channels"] == ["email", "webhook"]
    seuil = next(ligne for ligne in memoire.audit if ligne[3] == "alert_threshold")
    assert seuil[0] == "admin-clef"
    assert seuil[1] == "changement_reglage"
    assert seuil[4].obj == {"avant": "0", "apres": "0.2"}
    invalide = client.patch(
        "/admin/settings",
        headers=entete("administrateur"),
        json={"n8n_webhook_url": "javascript:alerte"},
    )
    assert invalide.status_code == 422
    assert invalide.json()["rejets"][0]["code"] == "REGLAGE_INVALIDE"


def test_metriques(client, monkeypatch, entete) -> None:
    class Base:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, requete, _params=None):
            if "percentile_cont" in requete:
                return Lignes([(4, 3, 2, 8)])
            if "FILTER" in requete:
                return Lignes([(1, 1, 1, 1)])
            if "audit_log" in requete:
                return Lignes([(2,)])
            raise AssertionError(requete)

    monkeypatch.setattr("app.db.session.psycopg.connect", lambda *_args, **_kwargs: Base())
    assert client.get("/metrics", headers=entete()).status_code == 403
    response = client.get("/metrics", headers=entete("gestionnaire"))
    assert response.status_code == 200
    body = response.json()
    assert body["volume"] == 4
    assert body["erreurs"] == 2
    assert body["distribution_scores"]["0.75-1"] == 1


def test_login(client, monkeypatch) -> None:
    stocke = hacher("secret-demo")

    class Base:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, _requete, params=None):
            if params[0] == "prestataire":
                return Lignes([(stocke, "prestataire", None, True)])
            return Lignes([])

    monkeypatch.setattr("app.db.session.psycopg.connect", lambda *_args, **_kwargs: Base())
    refus = client.post("/auth/login", json={"identifiant": "prestataire", "mot_de_passe": "non"})
    assert refus.status_code == 401
    ok = client.post(
        "/auth/login", json={"identifiant": "prestataire", "mot_de_passe": "secret-demo"}
    )
    assert ok.status_code == 200
    assert ok.json()["role"] == "prestataire"
    assert lire_jeton(f"Bearer {ok.json()['token']}").identifiant == "prestataire"


def test_lot_degrade(client, monkeypatch, entete) -> None:
    _brancher(monkeypatch)
    chemin = Path(__file__).parent / "fixtures" / "lot_degrade.json"
    lot = json.loads(chemin.read_text(encoding="utf-8"))
    response = client.post("/invoices/batch", headers=entete(), json={"factures": lot})
    assert response.status_code == 200
    statuts = [item["statut_http"] for item in response.json()["resultats"]]
    assert statuts == [422, 422, 200]
    assert response.json()["resultats"][2]["prediction"]["model_version"] == "v2"
