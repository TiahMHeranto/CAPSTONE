import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Path
from fastapi.responses import JSONResponse

from app.cleaning.validate import valider_facture
from app.core.auth import exiger
from app.core.tokens import Principal
from app.db.session import ouvrir
from app.schemas.facture import FactureIn
from app.schemas.flux import DecisionIn, LotFacturesIn
from app.services.flux import consulter_facture, decider, recevoir, recevoir_lot
from app.services.referentiel import lire_codes

logger = logging.getLogger(__name__)
router = APIRouter()
_FACTURE = Path(pattern=r"^[A-Za-z0-9._-]{1,64}$")


def charger_codes() -> tuple[set[str], set[str]]:
    with ouvrir() as connection:
        return lire_codes(connection)


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
