def generate_chat_response(message: str) -> dict:
    """Return the current development placeholder for chat."""

    return {
        "status": "success",
        "service": "DevMind AI Service",
        "mode": "development_stub",
        "message": "Hello DevMind",
        "reply": (
            "Your message reached the DevMind AI service. "
            "Real AI responses will be implemented later."
        ),
    }
