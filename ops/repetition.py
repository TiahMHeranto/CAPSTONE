"""Répétition technique. Lancer dans le conteneur API avec REPETITION_ID=1 ou 2."""

import json
import os
import sys
import time
import urllib.error
import urllib.request

import psycopg

from app.config import settings
from app.core.tokens import emettre

PASSAGE = os.environ.get("REPETITION_ID", "1")
ECHECS: list[str] = []


def appel(methode: str, chemin: str, role: str | None = None, corps: dict | None = None):
    donnees = None if corps is None else json.dumps(corps).encode()
    requete = urllib.request.Request(
        "http://127.0.0.1:8000" + chemin,
        data=donnees,
        method=methode,
    )
    requete.add_header("Content-Type", "application/json")
    if role:
        requete.add_header("Authorization", "Bearer " + emettre(role, role, None))
    try:
        with urllib.request.urlopen(requete, timeout=180) as reponse:
            return reponse.status, json.loads(reponse.read().decode())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode())


def verifier(nom: str, condition: bool, detail: str = "") -> None:
    if condition:
        print(f"OK {nom}")
        return
    ECHECS.append(nom)
    print(f"ECHEC {nom} {detail}")


def facture(identifiant: str, code: str, **ecarts) -> dict:
    montant = ecarts.get("montant", 19000)
    lignes = ecarts.get("lignes")
    if lignes is None:
        lignes = [
            {
                "code": code,
                "type_ligne": "ACTE",
                "quantite": 1,
                "prix_unitaire": montant if montant > 0 else 1000,
                "montant": montant if montant > 0 else 1000,
            }
        ]
    corps = {
        "facture_id": identifiant,
        "type_facture": "CONSULTATION",
        "date_soin": ecarts.get("soin", "2024-11-11"),
        "date_facture": ecarts.get("emission", "2024-11-12"),
        "montant_total": montant,
        "lignes": lignes,
    }
    if "devise" in ecarts:
        corps["devise"] = ecarts["devise"]
    if "reception" in ecarts:
        corps["date_reception"] = ecarts["reception"]
    return corps


def lot_de_vingt(code: str) -> list[dict]:
    invalides = [
        facture(
            f"FAC-R{PASSAGE}-01",
            "INCONNU",
            montant=-5,
            soin="2024-12-01",
            emission="2024-11-01",
        ),
        facture(f"FAC-R{PASSAGE}-02", code, montant=0, lignes=[]),
        facture(f"FAC-R{PASSAGE}-03", code, devise="EUR"),
        facture(
            f"FAC-R{PASSAGE}-04",
            code,
            montant=1000,
            lignes=[
                {
                    "code": code,
                    "type_ligne": "ACTE",
                    "quantite": 1,
                    "prix_unitaire": 19000,
                    "montant": 19000,
                }
            ],
        ),
        facture(
            f"FAC-R{PASSAGE}-05",
            code,
            lignes=[
                {
                    "code": code,
                    "type_ligne": "AUTRE",
                    "quantite": 1,
                    "prix_unitaire": 19000,
                    "montant": 19000,
                }
            ],
        ),
        facture(f"FAC-R{PASSAGE}-06", code, reception="2024-11-01"),
    ]
    valides = [
        facture(f"FAC-R{PASSAGE}-{index:02d}", code) for index in range(7, 21)
    ]
    return invalides + valides


def main() -> int:
    print(f"passage {PASSAGE}")
    statut, sante = appel("GET", "/health")
    verifier("sante", statut == 200 and sante.get("status") == "ok", str(statut))
    if PASSAGE == "2":
        statut, _corps = appel("GET", "/invoices/FAC-R1-CHAINE", "gestionnaire")
        verifier("persistance passage 1", statut == 200, str(statut))

    exemple = facture("FAC-ROLE-REFUS", "CONS-GEN")
    verifier("sans jeton", appel("POST", "/invoices", None, exemple)[0] == 401)
    verifier("assure depose", appel("POST", "/invoices", "assure", exemple)[0] == 403)
    verifier("prestataire reglages", appel("GET", "/admin/settings", "prestataire")[0] == 403)
    verifier("gestionnaire remboursements", appel("GET", "/me/remboursements", "gestionnaire")[0] == 403)
    verifier(
        "administrateur decide",
        appel(
            "POST",
            "/invoices/FAC-INCONNUE/decisions",
            "administrateur",
            {"decision": "valider", "motif": "hors role"},
        )[0]
        == 403,
    )

    with psycopg.connect(settings.psycopg_database_url) as connexion:
        code = connexion.execute(
            "SELECT code_acte FROM clean.referentiel_actes ORDER BY code_acte LIMIT 1"
        ).fetchone()[0]
    statut, corps = appel(
        "POST", "/invoices/batch", "prestataire", {"factures": lot_de_vingt(code)}
    )
    resultats = corps.get("resultats", []) if statut == 200 else []
    verifier("lot http", statut == 200 and len(resultats) == 20, str(statut))
    if len(resultats) == 20:
        invalides = resultats[:6]
        valides = resultats[6:]
        verifier(
            "invalides rejetees",
            all(item.get("statut_http") == 422 and item.get("rejets") for item in invalides),
        )
        verifier(
            "valides scorees",
            all(
                item.get("statut_http") == 200 and item.get("prediction", {}).get("score") is not None
                for item in valides
            ),
        )
        premiere = valides[0]["facture_id"]
        statut, prediction = appel("GET", f"/predictions/{premiere}", "gestionnaire")
        verifier(
            "shap",
            statut == 200 and len(prediction.get("explications", [])) > 0,
            str(statut),
        )

    statut, reglages = appel("GET", "/admin/settings", "administrateur")
    verifier("reglages", statut == 200, str(statut))
    seuil = reglages.get("alert_threshold")
    version = reglages.get("active_model_version")
    try:
        statut, _ = appel(
            "PATCH", "/admin/settings", "administrateur", {"alert_threshold": 0.01}
        )
        verifier("seuil abaisse", statut == 200, str(statut))
        chaine = f"FAC-R{PASSAGE}-CHAINE"
        statut, depose = appel("POST", "/invoices", "prestataire", facture(chaine, code))
        prediction = depose.get("prediction") or {}
        verifier(
            "chaine alerte",
            statut == 200 and prediction.get("classe") == "alerte" and depose.get("notifie") is True,
            str(statut) + " " + str(prediction.get("classe")) + " notifie=" + str(depose.get("notifie")),
        )
        statut, lu = appel("GET", f"/predictions/{chaine}", "gestionnaire")
        verifier("chaine shap", statut == 200 and lu.get("explications"), str(statut))
        statut, decision = appel(
            "POST",
            f"/invoices/{chaine}/decisions",
            "gestionnaire",
            {"decision": "complement", "motif": "pieces a completer"},
        )
        verifier(
            "decision",
            statut == 200 and decision.get("statut") == "COMPLEMENT",
            str(statut),
        )
        envois = 0
        for _ in range(10):
            with psycopg.connect(settings.psycopg_database_url) as connexion:
                envois = connexion.execute(
                    """
                    SELECT count(*) FROM app.alertes
                    WHERE facture_id = %s AND statut = 'envoye'
                    """,
                    (chaine,),
                ).fetchone()[0]
            if int(envois) >= 1:
                break
            time.sleep(0.5)
        verifier("notification", int(envois) >= 1, str(envois))
        statut, _ = appel(
            "PATCH",
            "/admin/settings",
            "administrateur",
            {"active_model_version": "mock-0.1"},
        )
        verifier("vers mock", statut == 200 and appel("GET", "/health")[0] == 200, str(statut))
        statut, _ = appel(
            "PATCH",
            "/admin/settings",
            "administrateur",
            {"active_model_version": version},
        )
        verifier("retour version", statut == 200 and appel("GET", "/health")[0] == 200, str(statut))
    finally:
        if seuil is not None:
            appel("PATCH", "/admin/settings", "administrateur", {"alert_threshold": seuil})
        if version:
            appel(
                "PATCH",
                "/admin/settings",
                "administrateur",
                {"active_model_version": version},
            )
    print(f"echecs {len(ECHECS)}")
    return 1 if ECHECS else 0


if __name__ == "__main__":
    sys.exit(main())
