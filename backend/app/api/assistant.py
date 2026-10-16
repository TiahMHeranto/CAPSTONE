from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.core.auth import exiger
from app.core.tokens import Principal
from app.schemas.flux import QuestionIn
from app.services.assistant import repondre

router = APIRouter()


@router.post("/assistant")
def ask(
    payload: QuestionIn,
    principal: Annotated[
        Principal,
        Depends(exiger("prestataire", "assure", "gestionnaire", "administrateur")),
    ],
) -> JSONResponse:
    status, body = repondre(payload.question, principal)
    return JSONResponse(status_code=status, content=body)
