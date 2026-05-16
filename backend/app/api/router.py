from fastapi import APIRouter

from app.api.routes import candidates, chat, demo, health, simulations

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
api_router.include_router(simulations.router, prefix="/simulations", tags=["simulations"])
api_router.include_router(demo.router, prefix="/demo", tags=["demo"])
