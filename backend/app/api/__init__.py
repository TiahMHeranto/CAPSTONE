from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.assistant import router as assistant_router
from app.api.health import router as health_router
from app.api.invoices import router as invoices_router
from app.api.lecture import router as lecture_router
from app.api.login import router as login_router
from app.api.pilotage import router as pilotage_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(login_router)
api_router.include_router(invoices_router)
api_router.include_router(pilotage_router)
api_router.include_router(admin_router)
api_router.include_router(assistant_router)
api_router.include_router(lecture_router)
