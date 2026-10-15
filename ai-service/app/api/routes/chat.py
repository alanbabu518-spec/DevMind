from fastapi import APIRouter, HTTPException

from app.schemas.chat import ChatRequest
from app.services.chat_service import generate_chat_response

router = APIRouter()


@router.post("/api/chat")
def chat(request: ChatRequest):
    try:
        return generate_chat_response(request.message)
    except RuntimeError as exc:
        message = str(exc)

        status_code = (
            503
            if "NVIDIA_API_KEY is missing" in message
            else 502
        )

        raise HTTPException(
            status_code=status_code,
            detail=message,
        ) from exc
