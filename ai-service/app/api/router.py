from fastapi import APIRouter

from app.api.routes import analysis, chat, health, readiness, repair

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(chat.router)
api_router.include_router(analysis.router)
api_router.include_router(readiness.router)
api_router.include_router(repair.router)
