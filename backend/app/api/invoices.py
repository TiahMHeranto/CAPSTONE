import hmac
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Header, Path, UploadFile
from fastapi.responses import JSONResponse

from app.cleaning.validate import valider_facture
from app.config import settings
from app.core.auth import exiger
from app.core.tokens import Principal
from app.db.session import ouvrir
from app.schemas.facture import FactureIn
from app.schemas.flux import DecisionIn, LotFacturesIn
from app.services.flux import consulter_facture, decider, recevoir, recevoir_lot
from app.services.ocr import (
    TAILLE_MAX,
    LectureRefusee,
    PdfIllisible,
    WorkflowIndisponible,
    demander_workflow,
    extraire_ordonnance,
    lire_fichiers,
)
from app.services.referentiel import lire_codes

logger = logging.getLogger(__name__)
router = APIRouter()
_FACTURE = Path(pattern=r"^[A-Za-z0-9._-]{1,64}$")


def charger_codes() -> tuple[set[str], set[str]]:
    with ouvrir() as connection:
        return lire_codes(connection)


@router.post("/invoices/ocr/lire")
def lire_ocr(
    payload: dict,
    x_admin_key: Annotated[str | None, Header()] = None,
) -> JSONResponse:
    attendue = settings.admin_api_key
    if not x_admin_key or not attendue or not hmac.compare_digest(x_admin_key, attendue):
        return JSONResponse(
            status_code=401,
            content={"code": "NON_AUTORISE", "motif": "clef requise"},
        )
    fichiers = payload.get("files") if isinstance(payload, dict) else None
    if not isinstance(fichiers, list):
        return JSONResponse(
            status_code=422,
            content={
                "code": "FICHIER_REFUSE",
                "motif": "le fichier doit etre un PDF de 8 Mo au plus",
            },
        )
    return JSONResponse(status_code=200, content=lire_fichiers(fichiers))


@router.post("/invoices/extract")
def extract_invoice(
    fichier: Annotated[UploadFile, File()],
    _principal: Annotated[
        Principal, Depends(exiger("prestataire", "gestionnaire", "administrateur"))
    ],
) -> JSONResponse:
    contenu = fichier.file.read(TAILLE_MAX + 1)
    if len(contenu) > TAILLE_MAX or not contenu.startswith(b"%PDF"):
        return JSONResponse(
            status_code=422,
            content={
                "code": "FICHIER_REFUSE",
                "motif": "le fichier doit etre un PDF de 8 Mo au plus",
            },
        )
    nom = fichier.filename or "facture.pdf"
    logger.info("ocr fichier=%s octets=%s", nom, len(contenu))
    try:
        resultat = demander_workflow(contenu, nom)
    except PdfIllisible:
        logger.warning("pdf illisible")
        return JSONResponse(
            status_code=422,
            content={"code": "PDF_ILLISIBLE", "motif": "le PDF ne peut pas etre lu"},
        )
    except LectureRefusee as refus:
        return JSONResponse(
            status_code=422,
            content={"code": refus.code, "motif": refus.motif},
        )
    except WorkflowIndisponible as exc:
        return JSONResponse(
            status_code=503,
            content={"code": exc.code, "motif": exc.motif},
        )
    return JSONResponse(status_code=200, content=resultat)


@router.post("/ordonnances/extract")
def extract_prescription(
    fichier: Annotated[UploadFile, File()],
    _principal: Annotated[
        Principal, Depends(exiger("prestataire", "gestionnaire", "administrateur"))
    ],
) -> JSONResponse:
    contenu = fichier.file.read(TAILLE_MAX + 1)
    if len(contenu) > TAILLE_MAX or not contenu.startswith(b"%PDF"):
        return JSONResponse(
            status_code=422,
            content={
                "code": "FICHIER_REFUSE",
                "motif": "le fichier doit etre un PDF de 8 Mo au plus",
            },
        )
    nom = fichier.filename or "ordonnance.pdf"
    try:
        resultat = extraire_ordonnance(contenu, nom)
    except PdfIllisible:
        return JSONResponse(
            status_code=422,
            content={"code": "PDF_ILLISIBLE", "motif": "le PDF ne peut pas etre lu"},
        )
    except LectureRefusee as refus:
        return JSONResponse(
            status_code=422,
            content={"code": refus.code, "motif": refus.motif},
        )
    return JSONResponse(status_code=200, content=resultat)


@router.post("/invoices/validate")
def validate_invoice(
    payload: FactureIn,
    _principal: Annotated[
        Principal, Depends(exiger("prestataire", "gestionnaire", "administrateur"))
    ],
) -> JSONResponse:
    try:
        codes_actes, codes_medicaments = charger_codes()
    except Exception as exc:
        logger.warning("referentiel inaccessible erreur=%s", type(exc).__name__)
        return JSONResponse(
            status_code=503,
            content={
                "valide": False,
                "rejets": [{"code": "BASE_INDISPONIBLE", "motif": "referentiel inaccessible"}],
            },
        )
    rejets = valider_facture(payload, codes_actes, codes_medicaments)
    body = {"valide": not rejets, "rejets": [rejet.model_dump() for rejet in rejets]}
    return JSONResponse(status_code=200 if not rejets else 422, content=body)


@router.post("/invoices")
def submit_invoice(
    payload: FactureIn,
    principal: Annotated[Principal, Depends(exiger("prestataire", "gestionnaire"))],
) -> JSONResponse:
    facture = payload
    if principal.role == "prestataire" and principal.prestataire_id:
        if not payload.assure_id:
            return JSONResponse(
                status_code=422,
                content={"code": "ASSURE_REQUIS", "motif": "une facture exige un assure"},
            )
        facture = payload.model_copy(update={"prestataire_id": principal.prestataire_id})
    status, body = recevoir(facture, principal.identifiant)
    return JSONResponse(status_code=status, content=body)


@router.post("/invoices/batch")
def submit_batch(
    payload: LotFacturesIn,
    principal: Annotated[Principal, Depends(exiger("prestataire", "gestionnaire"))],
) -> JSONResponse:
    status, body = recevoir_lot(payload.factures, principal.identifiant)
    return JSONResponse(status_code=status, content=body)


@router.get("/invoices/{facture_id}")
def read_invoice(
    facture_id: Annotated[str, _FACTURE],
    principal: Annotated[
        Principal, Depends(exiger("prestataire", "assure", "gestionnaire", "administrateur"))
    ],
) -> JSONResponse:
    status, body = consulter_facture(facture_id, principal)
    return JSONResponse(status_code=status, content=body)


@router.post("/invoices/{facture_id}/decisions")
def decide_invoice(
    facture_id: Annotated[str, _FACTURE],
    payload: DecisionIn,
    principal: Annotated[Principal, Depends(exiger("gestionnaire"))],
) -> JSONResponse:
    status, body = decider(facture_id, payload.decision, payload.motif, principal.identifiant)
    return JSONResponse(status_code=status, content=body)
