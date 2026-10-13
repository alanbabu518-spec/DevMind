from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import APP_NAME

app = FastAPI(
    title=APP_NAME,
    description="AI-powered developer analysis service for DevMind",
    version="1.0.0",
)

app.include_router(api_router)
