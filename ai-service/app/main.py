
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_FILE)

APP_NAME = os.getenv("APP_NAME", "DevMind AI Service")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

app = FastAPI(title=APP_NAME)


@app.get("/")
def root():
    return {"message": "Welcome to DevMind"}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": APP_NAME,
        "environment": ENVIRONMENT,
    }
    


@app.get("/ready")
def readiness_check():
    return {
        "status": "ready",
        "service": APP_NAME,
    }

