from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Path, Query, UploadFile
from fastapi.responses import JSONResponse

from app.core.auth import exiger
from app.core.tokens import Principal
from app.schemas.flux import AlerteJournalIn, ReglagesIn
from app.services.alertes import deposer, lister
from app.services.bi import tableau as tableau_bi
from app.services.corpus import deposer as deposer_corpus
from app.services.corpus import etat as etat_corpus
from app.services.corpus import lancer as lancer_corpus
from app.services.flux import (
    consulter_prediction,
    lire_reglages,
    lister_alertes,
    lister_remboursements,
    mesures,
    modifier_reglages,
)
from app.services.prescriptions import tableau as tableau_prescriptions
from app.services.supervision import relever_derive
from app.services.supervision import tableau as tableau_supervision

router = APIRouter()


@router.get("/predictions/{facture_id}")
def read_prediction(
    facture_id: Annotated[str, Path(pattern=r"^[A-Za-z0-9._-]{1,64}$")],
    principal: Annotated[Principal, Depends(exiger("gestionnaire", "administrateur"))],
) -> JSONResponse:
    status, body = consulter_prediction(facture_id, principal)
    return JSONResponse(status_code=status, content=body)


@router.get("/alerts")
def read_alerts(
    _principal: Annotated[Principal, Depends(exiger("gestionnaire", "administrateur"))],
) -> JSONResponse:
    status, body = lister_alertes()
    return JSONResponse(status_code=status, content=body)


@router.post("/alerts/journal")
def write_alert_journal(
    payload: AlerteJournalIn,
    _principal: Annotated[Principal, Depends(exiger("administrateur"))],
) -> JSONResponse:
    status, body = deposer(
        payload.facture_id,
        payload.canal,
        payload.statut,
        payload.tentative,
        payload.score,
        payload.message,
    )
    return JSONResponse(status_code=status, content=body)


@router.get("/alerts/prescriptions")
def read_prescription_alerts(
    _principal: Annotated[Principal, Depends(exiger("gestionnaire", "administrateur"))],
) -> JSONResponse:
    status, body = tableau_prescriptions()
    return JSONResponse(status_code=status, content=body)


@router.get("/alerts/journal")
def read_alert_journal(
    _principal: Annotated[Principal, Depends(exiger("gestionnaire", "administrateur"))],
    statut: Annotated[Literal["envoye", "echec"] | None, Query()] = None,
) -> JSONResponse:
    status, body = lister(statut)
    return JSONResponse(status_code=status, content=body)


@router.get("/me/remboursements")
def read_reimbursements(
    principal: Annotated[Principal, Depends(exiger("assure"))],
) -> JSONResponse:
    status, body = lister_remboursements(principal)
    return JSONResponse(status_code=status, content=body)


@router.get("/admin/settings")
def read_settings(
    _principal: Annotated[Principal, Depends(exiger("administrateur"))],
) -> JSONResponse:
    status, body = lire_reglages()
    return JSONResponse(status_code=status, content=body)


@router.patch("/admin/settings")
def update_settings(
    payload: ReglagesIn,
    principal: Annotated[Principal, Depends(exiger("administrateur"))],
) -> JSONResponse:
    status, body = modifier_reglages(principal.identifiant, payload.model_dump(exclude_unset=True))
    return JSONResponse(status_code=status, content=body)


@router.get("/admin/assistant/corpus")
def read_corpus(
    _principal: Annotated[Principal, Depends(exiger("administrateur"))],
) -> JSONResponse:
    return JSONResponse(status_code=200, content=etat_corpus())


@router.post("/admin/assistant/corpus")
async def upload_corpus(
    _principal: Annotated[Principal, Depends(exiger("administrateur"))],
    fichiers: Annotated[list[UploadFile], File()],
) -> JSONResponse:
    morceaux: list[tuple[str, bytes]] = []
    for fichier in fichiers:
        nom = fichier.filename or ""
        contenu = await fichier.read()
        morceaux.append((nom, contenu))
    status, body = deposer_corpus(morceaux)
    return JSONResponse(status_code=status, content=body)


@router.post("/admin/assistant/reindex")
def reindex_corpus(
    _principal: Annotated[Principal, Depends(exiger("administrateur"))],
) -> JSONResponse:
    status, body = lancer_corpus()
    return JSONResponse(status_code=status, content=body)


@router.get("/admin/drift")
def read_drift(
    principal: Annotated[Principal, Depends(exiger("administrateur"))],
) -> JSONResponse:
    status, body = relever_derive(principal.identifiant)
    return JSONResponse(status_code=status, content=body)


@router.get("/admin/supervision")
def read_supervision(
    principal: Annotated[Principal, Depends(exiger("administrateur"))],
) -> JSONResponse:
    status, body = tableau_supervision(principal.identifiant)
    return JSONResponse(status_code=status, content=body)


@router.get("/bi")
def read_bi(
    _principal: Annotated[Principal, Depends(exiger("gestionnaire", "administrateur"))],
) -> JSONResponse:
    status, body = tableau_bi()
    return JSONResponse(status_code=status, content=body)


@router.get("/metrics")
def read_metrics(
    _principal: Annotated[Principal, Depends(exiger("gestionnaire", "administrateur"))],
) -> JSONResponse:
    status, body = mesures()
    return JSONResponse(status_code=status, content=body)
