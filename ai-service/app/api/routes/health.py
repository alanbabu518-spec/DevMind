from fastapi import APIRouter
from app.core.config import APP_NAME

router = APIRouter()

@router.get("/")
def root():
    return {
        "status": "success",
        "service": APP_NAME,
        "message": "DevMind AI Service is running",
    }


@router.get("/health")
def health():
    return {
        "status": "healthy",
        "service": APP_NAME,
    }


@router.get("/ready")
def ready():
    return {
        "status": "ready",
        "service": APP_NAME,
    }
