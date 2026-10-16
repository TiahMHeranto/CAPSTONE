from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.core.auth import exiger
from app.core.tokens import Principal
from app.schemas.flux import UtilisateurIn
from app.services.comptes import (
    annuaire,
    contrat_de,
    creer,
    factures_de,
    lister,
    ordonnances_de,
    profil,
)

router = APIRouter()


@router.post("/admin/utilisateurs")
def create_user(
    payload: UtilisateurIn,
    principal: Annotated[Principal, Depends(exiger("administrateur"))],
) -> JSONResponse:
    status, body = creer(principal.identifiant, payload)
    return JSONResponse(status_code=status, content=body)


@router.get("/admin/utilisateurs")
def list_users(
    _principal: Annotated[Principal, Depends(exiger("administrateur"))],
) -> JSONResponse:
    status, body = lister()
    return JSONResponse(status_code=status, content=body)


@router.get("/admin/annuaire")
def search_directory(
    _principal: Annotated[Principal, Depends(exiger("administrateur"))],
    cible: Annotated[str, Query(min_length=1, max_length=20)],
) -> JSONResponse:
    status, body = annuaire(cible)
    return JSONResponse(status_code=status, content=body)


@router.get("/me/profil")
def read_profile(
    principal: Annotated[
        Principal, Depends(exiger("prestataire", "assure", "gestionnaire", "administrateur"))
    ],
) -> JSONResponse:
    status, body = profil(principal)
    return JSONResponse(status_code=status, content=body)


@router.get("/me/contrat")
def read_contract(
    principal: Annotated[Principal, Depends(exiger("prestataire", "assure"))],
) -> JSONResponse:
    status, body = contrat_de(principal)
    return JSONResponse(status_code=status, content=body)


@router.get("/me/factures")
def read_invoices(
    principal: Annotated[Principal, Depends(exiger("prestataire", "assure"))],
) -> JSONResponse:
    status, body = factures_de(principal)
    return JSONResponse(status_code=status, content=body)


@router.get("/me/ordonnances")
def read_prescriptions(
    principal: Annotated[Principal, Depends(exiger("prestataire", "assure"))],
) -> JSONResponse:
    status, body = ordonnances_de(principal)
    return JSONResponse(status_code=status, content=body)
