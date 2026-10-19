from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    # Repository context can make chat prompts longer than a normal message.
    # Keep a bounded limit so FastAPI accepts legitimate analysis requests.
    message: str = Field(min_length=1, max_length=955000)
