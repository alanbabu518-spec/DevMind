import os

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

load_dotenv()

app = FastAPI()

APP_NAME = os.getenv("APP_NAME", "DevMind AI Service")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


class ChatRequest(BaseModel):
    message: str


@app.get("/")
def root():
    return {
        "service": APP_NAME,
        "environment": ENVIRONMENT,
        "status": "running"
    }


@app.post("/api/chat")
def chat(request: ChatRequest):
    user_message = request.message

    return {
        "message": user_message,
        "response": f"DevMind received your message: {user_message}",
        "service": APP_NAME
    }