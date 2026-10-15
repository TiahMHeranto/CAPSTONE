from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.db.health import database_ok
from app.services.inference import MODEL_VERSION

router = APIRouter()


@router.get("/health")
def health() -> JSONResponse:
    if not database_ok():
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "database": "unavailable"},
        )
    return JSONResponse(
        status_code=200,
        content={
            "status": "ok",
            "database": "ok",
            "model_version": MODEL_VERSION,
        },
    )
