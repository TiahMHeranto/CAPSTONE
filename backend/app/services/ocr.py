"""Lecture d'un PDF, puis extraction par le workflow n8n et le modèle local.

Le webhook reçoit le fichier. Ollama structure le texte. Le PDF n'est pas enregistré.
"""

import base64
import json
import logging
import re
import unicodedata
import urllib.error
import urllib.request
from io import BytesIO

from pypdf import PdfReader

from app.config import settings

logger = logging.getLogger(__name__)

TAILLE_MAX = 8_000_000
TEXTE_MAX = 20_000
PAGES_MAX = 3

LIBELLES = {
    "identifiant": "facture_id",
    "numero": "facture_id",
    "numero facture": "facture_id",
    "n facture": "facture_id",
    "facture": "facture_id",
    "facture id": "facture_id",
    "type": "type_facture",
    "type facture": "type_facture",
    "type de facture": "type_facture",
    "date de soin": "date_soin",
    "date soin": "date_soin",
    "date des soins": "date_soin",
    "date de facture": "date_facture",
    "date facture": "date_facture",
    "date de reception": "date_reception",
    "montant total": "montant_total",
    "montant": "montant_total",
    "total": "montant_total",
    "devise": "devise",
    "prestataire": "prestataire_id",
    "prestataire id": "prestataire_id",
    "assure": "assure_id",
    "assure id": "assure_id",
    "contrat": "contrat_id",
    "contrat id": "contrat_id",
    "ordonnance": "ordonnance_id",
    "ordonnance id": "ordonnance_id",
    "mode de reglement": "mode_reglement",
}

_LIGNE = re.compile(
    r"^([A-Za-z0-9._-]{1,64})\s*[|;,]\s*(ACTE|MEDICAMENT)\s*[|;,]\s*"
    r"(\d+(?:[.,]\d+)?)\s*[|;,]\s*(\d[\d .]*)\s*[|;,]\s*(\d[\d .]*)\s*$",
    re.IGNORECASE,
)
_REQUIS = ("facture_id", "type_facture", "date_soin", "date_facture", "montant_total")


class WorkflowIndisponible(Exception):
    def __init__(
        self,
        code: str = "WORKFLOW_INDISPONIBLE",
        motif: str = "le workflow OCR ne repond pas",
    ) -> None:
        self.code = code
        self.motif = motif


class PdfIllisible(Exception):
    pass


class LectureRefusee(Exception):
    def __init__(self, code: str, motif: str) -> None:
        self.code = code
        self.motif = motif


def _norm(valeur: str) -> str:
    decompose = unicodedata.normalize("NFD", valeur)
    sans = "".join(car for car in decompose if unicodedata.category(car) != "Mn")
    return re.sub(r"\s+", " ", sans).strip().lower()


def _date(valeur: str) -> str | None:
    propre = valeur.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", propre):
        return propre
    morceau = re.fullmatch(r"(\d{2})[/. -](\d{2})[/. -](\d{4})", propre)
    if morceau:
        jour, mois, annee = morceau.groups()
        return f"{annee}-{mois}-{jour}"
    return None


def _entier(valeur: str) -> int | None:
    propre = valeur.strip().replace("\u00a0", " ")
    propre = re.sub(r"(?i)\s*(mga|ar)$", "", propre).strip()
    if re.fullmatch(r"\d{1,3}(?:[ .]\d{3})+", propre):
        return int(re.sub(r"[ .]", "", propre))
    if re.fullmatch(r"\d+", propre):
        return int(propre)
    return None


def analyser_texte(texte: str) -> dict:
    trouves: dict = {}
    lignes: list[dict] = []
    for brute in texte.splitlines():
        ligne = brute.strip()
        if not ligne:
            continue
        morceau = _LIGNE.fullmatch(ligne)
        if morceau:
            prix = _entier(morceau.group(4))
            montant = _entier(morceau.group(5))
            quantite = float(morceau.group(3).replace(",", "."))
            if prix is None or montant is None:
                continue
            lignes.append(
                {
                    "code": morceau.group(1),
                    "type_ligne": morceau.group(2).upper(),
                    "quantite": quantite,
                    "prix_unitaire": prix,
                    "montant": montant,
                }
            )
            continue
        separe = re.match(r"^(.+?)\s*[:=]\s*(.+)$", ligne) or re.match(r"^(.+?)\s+-\s+(.+)$", ligne)
        if not separe:
            continue
        champ = LIBELLES.get(_norm(separe.group(1)))
        if not champ or champ in trouves:
            continue
        valeur = separe.group(2).strip().strip(".,;")
        if champ in {"date_soin", "date_facture", "date_reception"}:
            iso = _date(valeur)
            if iso:
                trouves[champ] = iso
            continue
        if champ == "montant_total":
            nombre = _entier(valeur)
            if nombre is not None:
                trouves[champ] = nombre
            continue
        if champ == "devise":
            if re.fullmatch(r"[A-Za-z]{3}", valeur):
                trouves[champ] = valeur.upper()
            continue
        if champ == "type_facture" and re.fullmatch(r"[A-Za-z0-9 ._-]{1,40}", valeur):
            trouves[champ] = re.sub(r"\s+", "_", valeur).upper()
            continue
        if re.fullmatch(r"[A-Za-z0-9._-]{1,64}", valeur):
            trouves[champ] = valeur
    if "montant_total" not in trouves and lignes:
        trouves["montant_total"] = sum(ligne["montant"] for ligne in lignes)
    manquants = [champ for champ in _REQUIS if champ not in trouves]
    if not lignes:
        manquants.append("lignes")
    return {
        "complet": not manquants,
        "champs_manquants": manquants,
        "facture": {**trouves, "lignes": lignes},
    }


def lire_texte(contenu: bytes) -> tuple[str, str]:
    try:
        lecteur = PdfReader(BytesIO(contenu))
        pages = [(page.extract_text() or "") for page in lecteur.pages[:PAGES_MAX]]
    except Exception as exc:
        raise PdfIllisible from exc
    texte = "\n".join(pages).strip()
    if len(re.findall(r"[A-Za-z0-9]", texte)) >= 20:
        return texte[:TEXTE_MAX], "pypdf"
    ocr = _tesseract(contenu)
    if ocr.strip():
        return ocr[:TEXTE_MAX], "tesseract"
    return "", "aucun"


def _tesseract(contenu: bytes) -> str:
    try:
        import pypdfium2 as pdfium
        import pytesseract
    except ImportError:
        return ""
    try:
        document = pdfium.PdfDocument(contenu)
    except Exception:
        return ""
    morceaux: list[str] = []
    try:
        for index in range(min(len(document), PAGES_MAX)):
            page = document[index]
            image = page.render(scale=2).to_pil()
            page.close()
            try:
                morceaux.append(pytesseract.image_to_string(image, lang="fra+eng"))
            except Exception:
                try:
                    morceaux.append(pytesseract.image_to_string(image))
                except Exception:
                    return ""
    finally:
        document.close()
    return "\n".join(morceaux)


def lire_fichiers(fichiers: list[dict]) -> dict:
    sortis = []
    for index, fichier in enumerate(fichiers[:5]):
        if not isinstance(fichier, dict):
            continue
        nom = (
            fichier.get("filename")
            if isinstance(fichier.get("filename"), str)
            else f"fichier_{index}.pdf"
        )
        texte_fourni = fichier.get("texte") if isinstance(fichier.get("texte"), str) else ""
        if texte_fourni.strip():
            sortis.append(
                {
                    "index": index,
                    "filename": nom,
                    "texte": texte_fourni[:TEXTE_MAX],
                    "moteur": "fourni",
                }
            )
            continue
        brut = fichier.get("base64")
        if not isinstance(brut, str) or not brut:
            continue
        try:
            contenu = base64.b64decode(brut, validate=False)
        except Exception:
            continue
        if len(contenu) > TAILLE_MAX or not contenu.startswith(b"%PDF"):
            continue
        try:
            texte, moteur = lire_texte(contenu)
        except PdfIllisible:
            continue
        sortis.append({"index": index, "filename": nom, "texte": texte, "moteur": moteur})
    return {"files": sortis}


def demander_workflow(contenu: bytes, nom: str) -> dict:
    url = settings.n8n_ocr_url
    if not url.startswith(("http://", "https://")):
        raise WorkflowIndisponible
    charge = {
        "filename": nom or "facture.pdf",
        "mime_type": "application/pdf",
        "base64": base64.b64encode(contenu).decode("ascii"),
    }
    requete = urllib.request.Request(
        url,
        data=json.dumps(charge).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Ocr-Key": settings.admin_api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(requete, timeout=150) as reponse:
            recu = json.loads(reponse.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
        logger.warning("workflow ocr erreur=%s", type(exc).__name__)
        raise WorkflowIndisponible from exc
    if not isinstance(recu, dict):
        raise WorkflowIndisponible
    return _reponse_workflow(recu)


def _reponse_workflow(recu: dict) -> dict:
    if recu.get("ok") is False:
        code = recu.get("code") if isinstance(recu.get("code"), str) else "WORKFLOW_INDISPONIBLE"
        if code == "PDF_SANS_TEXTE":
            raise LectureRefusee(code, "aucune ligne lisible, ni dans le texte du PDF ni par OCR")
        if code == "FICHIER_REFUSE":
            raise LectureRefusee(code, "le fichier doit etre un PDF de 8 Mo au plus")
        if code == "EXTRACTION_ILLISIBLE":
            raise LectureRefusee(code, "le modele n'a pas renvoye une facture lisible")
        if code == "MODELE_INDISPONIBLE":
            raise WorkflowIndisponible(code, "le modele local ne repond pas")
        raise WorkflowIndisponible
    brut = recu.get("factures")
    if not isinstance(brut, list):
        brut = [recu["facture"]] if isinstance(recu.get("facture"), dict) else []
    factures = [_normaliser(item) for item in brut if isinstance(item, dict)]
    if not factures:
        raise LectureRefusee(
            "EXTRACTION_ILLISIBLE", "le modele n'a pas renvoye une facture lisible"
        )
    premiere = factures[0]
    return {
        "complet": premiere["complet"],
        "champs_manquants": premiere["champs_manquants"],
        "facture": premiere["facture"],
        "factures": factures,
        "moteur": recu.get("moteur") if isinstance(recu.get("moteur"), str) else "ollama",
    }


def _entier_souple(valeur: object) -> int | None:
    if isinstance(valeur, bool):
        return None
    if isinstance(valeur, int):
        return valeur
    if isinstance(valeur, float) and valeur.is_integer():
        return int(valeur)
    return None


def _normaliser(recu: dict) -> dict:
    brut = recu.get("facture") if isinstance(recu.get("facture"), dict) else recu
    facture: dict = {}
    for champ in (
        "facture_id",
        "type_facture",
        "date_soin",
        "date_facture",
        "date_reception",
        "devise",
        "prestataire_id",
        "assure_id",
        "contrat_id",
        "ordonnance_id",
        "mode_reglement",
    ):
        valeur = brut.get(champ)
        if not isinstance(valeur, str) or not valeur or valeur.lower() == "null":
            continue
        if champ in {"facture_id", "prestataire_id", "assure_id", "contrat_id", "ordonnance_id"}:
            valeur = valeur.replace("/", "-").replace("\\", "-").replace(" ", "")
        if champ in {"date_soin", "date_facture", "date_reception"}:
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", valeur):
                continue
        elif champ != "type_facture" and not re.fullmatch(r"[A-Za-z0-9._-]{1,64}", valeur):
            continue
        elif champ == "type_facture" and not re.fullmatch(r"[A-Za-z0-9 ._-]{1,40}", valeur):
            continue
        facture[champ] = valeur
    montant_total = _entier_souple(brut.get("montant_total"))
    if montant_total is not None:
        facture["montant_total"] = montant_total
    lignes = []
    for ligne in brut.get("lignes") or []:
        if not isinstance(ligne, dict) or not isinstance(ligne.get("code"), str):
            continue
        prix = _entier_souple(ligne.get("prix_unitaire"))
        montant = _entier_souple(ligne.get("montant"))
        if prix is None or montant is None:
            continue
        quantite = ligne.get("quantite")
        if not isinstance(quantite, (int, float)):
            continue
        type_ligne = ligne.get("type_ligne")
        if type_ligne not in {"ACTE", "MEDICAMENT"}:
            type_ligne = "ACTE"
        lignes.append(
            {
                "code": ligne["code"],
                "type_ligne": type_ligne,
                "quantite": quantite,
                "prix_unitaire": prix,
                "montant": montant,
            }
        )
    facture["lignes"] = lignes
    facture["canal_reception"] = "pdf"
    facture.setdefault("devise", "MGA")
    manquants = [champ for champ in _REQUIS if champ not in facture]
    if not lignes:
        manquants.append("lignes")
    return {"complet": not manquants, "champs_manquants": manquants, "facture": facture}
