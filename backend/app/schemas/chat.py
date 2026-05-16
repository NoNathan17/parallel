from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    thread_id: str | None = Field(
        default=None,
        description="Reuse a thread id to continue a conversation.",
    )


class ChatResponse(BaseModel):
    reply: str
    thread_id: str
