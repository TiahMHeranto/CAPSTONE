import base64
import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import settings
from app.services.ocr import analyser_texte

RACINE = Path(__file__).resolve().parents[2]
TEXTE = """Identifiant: FAC-OCR-1
Type: CONSULTATION
Date de soin: 15/10/2026
Date de facture: 2026-10-16
Montant total: 15 000 MGA
Assure: ASR-1
ACC-CESAR | ACTE | 2 | 7500 | 15000
"""


def pdf_simple(lignes: list[str]) -> bytes:
    corps = ["BT /F1 11 Tf 36 560 Td 16 TL"]
    for ligne in lignes:
        propre = ligne.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        corps.append(f"({propre}) Tj T*")
    corps.append("ET")
    flux = "\n".join(corps).encode("latin-1")
    objets = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 640] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
        b"<< /Length %d >>\nstream\n" % len(flux) + flux + b"\nendstream\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]
    objets[3] = b"4 0 obj\n" + objets[3]
    sortie = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for objet in objets:
        offsets.append(len(sortie))
        sortie.extend(objet)
    debut = len(sortie)
    sortie.extend(f"xref\n0 {len(offsets)}\n".encode())
    sortie.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        sortie.extend(f"{offset:010d} 00000 n \n".encode())
    sortie.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{debut}\n%%EOF\n".encode()
    )
    return bytes(sortie)


def test_analyse_une_facture_etiquetee() -> None:
    recu = analyser_texte(TEXTE)
    assert recu["complet"] is True
    assert recu["champs_manquants"] == []
    facture = recu["facture"]
    assert facture["facture_id"] == "FAC-OCR-1"
    assert facture["date_soin"] == "2026-10-15"
    assert facture["date_facture"] == "2026-10-16"
    assert facture["montant_total"] == 15000
    assert facture["lignes"][0]["quantite"] == 2
    assert facture["lignes"][0]["type_ligne"] == "ACTE"


def test_analyse_signale_les_champs_absents() -> None:
    recu = analyser_texte("Identifiant: FAC-OCR-2\n")
    assert recu["complet"] is False
    assert "date_soin" in recu["champs_manquants"]
    assert "lignes" in recu["champs_manquants"]


def test_workflow_recoit_un_fichier_et_appelle_ollama() -> None:
    workflow = json.loads((RACINE / "n8n" / "workflows" / "ocr.json").read_text(encoding="utf-8"))
    noms = [noeud["name"] for noeud in workflow["nodes"]]
    assert noms[0] == "Depot PDF"
    assert workflow["nodes"][0]["parameters"]["path"] == "ocr"
    assert "Regrouper fichiers" in noms
    assert "Extraction Ollama" in noms
    assert "Parser et eclater" in noms
    texte = json.dumps(workflow)
    assert "google" not in texte.lower()
    assert "gemini" not in texte.lower()
    assert "host.docker.internal:11434" in texte
    regrouper = (RACINE / "n8n" / "workflows" / "ocr-regrouper.js").read_text(encoding="utf-8")
    code = next(
        noeud["parameters"]["jsCode"]
        for noeud in workflow["nodes"]
        if noeud["name"] == "Regrouper fichiers"
    )
    assert code == regrouper


def test_extract_remplit_depuis_le_pdf(client: TestClient, entete, monkeypatch) -> None:
    from app.services.ocr import _reponse_workflow

    def faux(contenu: bytes, nom: str) -> dict:
        assert contenu.startswith(b"%PDF")
        assert nom == "facture.pdf"
        return _reponse_workflow(
            {
                "ok": True,
                "moteur": "ollama",
                "factures": [
                    {
                        "facture_id": "FAC-OCR-1",
                        "type_facture": "CONSULTATION",
                        "date_soin": "2026-10-15",
                        "date_facture": "2026-10-16",
                        "montant_total": 15000,
                        "email": "cache@example.test",
                        "lignes": [
                            {
                                "code": "ACC-CESAR",
                                "type_ligne": "ACTE",
                                "quantite": 2,
                                "prix_unitaire": 7500,
                                "montant": 15000,
                            }
                        ],
                    }
                ],
            }
        )

    monkeypatch.setattr("app.api.invoices.demander_workflow", faux)
    contenu = pdf_simple(TEXTE.strip().splitlines())
    reponse = client.post(
        "/invoices/extract",
        headers=entete("gestionnaire"),
        files={"fichier": ("facture.pdf", contenu, "application/pdf")},
    )
    assert reponse.status_code == 200
    corps = reponse.json()
    assert corps["moteur"] == "ollama"
    assert "email" not in corps["facture"]
    assert corps["facture"]["facture_id"] == "FAC-OCR-1"
    assert corps["facture"]["canal_reception"] == "pdf"
    assert corps["complet"] is True


def test_fichier_autre_que_pdf(client: TestClient, entete) -> None:
    reponse = client.post(
        "/invoices/extract",
        headers=entete("prestataire"),
        files={"fichier": ("note.txt", b"bonjour", "text/plain")},
    )
    assert reponse.status_code == 422
    assert reponse.json()["code"] == "FICHIER_REFUSE"


def test_assure_ne_depose_pas(client: TestClient, entete) -> None:
    reponse = client.post(
        "/invoices/extract",
        headers=entete("assure"),
        files={"fichier": ("facture.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert reponse.status_code == 403


def test_modele_local_absent(client: TestClient, entete, monkeypatch) -> None:
    from app.services.ocr import WorkflowIndisponible

    def absent(_contenu: bytes, _nom: str) -> dict:
        raise WorkflowIndisponible("MODELE_INDISPONIBLE", "le modele local ne repond pas")

    monkeypatch.setattr("app.api.invoices.demander_workflow", absent)
    reponse = client.post(
        "/invoices/extract",
        headers=entete("prestataire"),
        files={"fichier": ("facture.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert reponse.status_code == 503
    assert reponse.json()["code"] == "MODELE_INDISPONIBLE"


def test_workflow_absent(client: TestClient, entete, monkeypatch) -> None:
    from app.services.ocr import WorkflowIndisponible

    def absent(_contenu: bytes, _nom: str) -> dict:
        raise WorkflowIndisponible

    monkeypatch.setattr("app.api.invoices.demander_workflow", absent)
    contenu = pdf_simple(TEXTE.strip().splitlines())
    reponse = client.post(
        "/invoices/extract",
        headers=entete("prestataire"),
        files={"fichier": ("facture.pdf", contenu, "application/pdf")},
    )
    assert reponse.status_code == 503
    assert reponse.json()["code"] == "WORKFLOW_INDISPONIBLE"


def test_lire_le_pdf_pour_le_workflow(client: TestClient) -> None:
    contenu = pdf_simple(TEXTE.strip().splitlines())
    reponse = client.post(
        "/invoices/ocr/lire",
        headers={"X-Admin-Key": settings.admin_api_key},
        json={
            "files": [
                {
                    "filename": "facture.pdf",
                    "base64": base64.b64encode(contenu).decode("ascii"),
                }
            ]
        },
    )
    assert reponse.status_code == 200
    fichiers = reponse.json()["files"]
    assert fichiers[0]["moteur"] == "pypdf"
    assert "FAC-OCR-1" in fichiers[0]["texte"]


def test_lire_sans_clef(client: TestClient) -> None:
    reponse = client.post("/invoices/ocr/lire", json={"files": []})
    assert reponse.status_code == 401


def test_pdf_sans_texte(client: TestClient, entete, monkeypatch) -> None:
    from app.services.ocr import LectureRefusee

    def refus(_contenu: bytes, _nom: str) -> dict:
        raise LectureRefusee("PDF_SANS_TEXTE", "aucune ligne lisible")

    monkeypatch.setattr("app.api.invoices.demander_workflow", refus)
    reponse = client.post(
        "/invoices/extract",
        headers=entete("prestataire"),
        files={"fichier": ("vide.pdf", b"%PDF-vide", "application/pdf")},
    )
    assert reponse.status_code == 422
    assert reponse.json()["code"] == "PDF_SANS_TEXTE"
