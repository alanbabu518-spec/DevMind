
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel, Field

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_FILE)

APP_NAME = os.getenv("APP_NAME", "DevMind AI Service")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

app = FastAPI(title=APP_NAME)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=10000)


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


@app.post("/api/chat")
def chat(request: ChatRequest):
    message = request.message.strip()

    if not message:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=422,
            detail="Message must not be blank",
        )

    return {
        "status": "success",
        "service": APP_NAME,
        "mode": "development_stub",
        "message": message,
        "reply": (
            "Your message reached the DevMind AI service. "
            "Real AI responses will be implemented on Day 4."
        ),
    }
