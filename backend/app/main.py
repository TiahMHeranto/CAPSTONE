import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.logging import configure_logging
from app.core.tokens import AccesRefuse

configure_logging()
logger = logging.getLogger("prediccare.http")


@asynccontextmanager
async def duree_de_vie(_app: FastAPI):
    from app.services.corpus import indexer_si_vide

    indexer_si_vide()
    yield


app = FastAPI(title="PrediCare TPA", version="0.1.0", lifespan=duree_de_vie)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)


@app.middleware("http")
async def journal_requete(request: Request, suite):
    debut = time.perf_counter()
    response = await suite(request)
    logger.info(
        "requete",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duree_ms": int((time.perf_counter() - debut) * 1000),
        },
    )
    return response


@app.exception_handler(RequestValidationError)
async def rejet_type_invalide(_request: Request, exc: RequestValidationError) -> JSONResponse:
    rejets = []
    for error in exc.errors():
        location = ".".join(str(part) for part in error.get("loc", []) if part != "body")
        rejets.append({"code": "TYPE_INVALIDE", "motif": f"{location}: {error.get('msg', '')}"})
    return JSONResponse(status_code=422, content={"valide": False, "rejets": rejets})


@app.exception_handler(AccesRefuse)
async def acces_refuse(_request: Request, exc: AccesRefuse) -> JSONResponse:
    return JSONResponse(status_code=exc.status, content={"code": exc.code, "motif": exc.motif})
