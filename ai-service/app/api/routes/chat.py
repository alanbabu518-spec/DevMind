from fastapi import APIRouter

from app.schemas.chat import ChatRequest
from app.services.chat_service import generate_chat_response

router = APIRouter()


@router.post("/api/chat")
def chat(request: ChatRequest):
    return generate_chat_response(request.message)
