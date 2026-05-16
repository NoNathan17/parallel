from fastapi import APIRouter, HTTPException, Request

from app.config import get_settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.graph_service import run_chat

router = APIRouter()


@router.post("", response_model=ChatResponse)
async def chat(request: Request, payload: ChatRequest) -> ChatResponse:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured. Copy .env.example to .env and set your key.",
        )

    graph = request.app.state.graph
    return await run_chat(graph, payload)
