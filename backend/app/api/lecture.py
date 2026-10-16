from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from fastapi.responses import JSONResponse

from app.core.auth import exiger
from app.core.tokens import Principal
from app.services.lecture import catalogue, lire

router = APIRouter()
_LECTURE = Depends(exiger("gestionnaire", "administrateur"))


def _page(schema: str, table: str, limit: int, offset: int) -> JSONResponse:
    status, body = lire(schema, table, limit, offset)
    return JSONResponse(status_code=status, content=body)


@router.get("/read")
def index(
    _principal: Annotated[Principal, _LECTURE],
) -> JSONResponse:
    status, body = catalogue()
    return JSONResponse(status_code=status, content=body)


@router.get("/read/factures")
def factures(
    _principal: Annotated[Principal, _LECTURE],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0, le=1_000_000)] = 0,
) -> JSONResponse:
    return _page("app", "factures", limit, offset)


@router.get("/read/journal")
def journal(
    _principal: Annotated[Principal, _LECTURE],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0, le=1_000_000)] = 0,
) -> JSONResponse:
    return _page("app", "alertes", limit, offset)


@router.get("/read/{schema}/{table}")
def relation(
    schema: Annotated[str, Path(pattern=r"^[a-z][a-z0-9_]{0,62}$")],
    table: Annotated[str, Path(pattern=r"^[a-z][a-z0-9_]{0,62}$")],
    _principal: Annotated[Principal, _LECTURE],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0, le=1_000_000)] = 0,
) -> JSONResponse:
    return _page(schema, table, limit, offset)
