from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.schemas.simulation import (
    SimulationCreate,
    SimulationReplay,
    SimulationResponse,
)
from app.services.simulation_service import start_simulation_task
from app.store import store

router = APIRouter()


def _require_openai() -> None:
    if not get_settings().openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured.")


@router.post("", response_model=SimulationResponse)
async def create_simulation(payload: SimulationCreate) -> SimulationResponse:
    _require_openai()
    if payload.candidate_id not in store.candidates:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    variant_ids = payload.variant_ids or store.get_variant_ids(payload.candidate_id)
    if not variant_ids:
        raise HTTPException(status_code=400, detail="No variants found. Generate variants first.")

    sim = start_simulation_task(
        candidate_id=payload.candidate_id,
        variant_ids=variant_ids,
        interventions=payload.interventions,
    )
    return SimulationResponse(simulation=sim)


@router.get("/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(simulation_id: str) -> SimulationResponse:
    sim = store.simulations.get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found.")
    return SimulationResponse(simulation=sim)


@router.get("/{simulation_id}/events")
async def stream_simulation_events(simulation_id: str) -> StreamingResponse:
    if simulation_id not in store.simulations:
        raise HTTPException(status_code=404, detail="Simulation not found.")

    queue = store.get_or_create_queue(simulation_id)

    async def event_generator():
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
                continue

            if event is None:
                yield "data: {\"type\": \"stream.end\"}\n\n"
                break

            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{simulation_id}/replay", response_model=SimulationResponse)
async def replay_simulation(
    simulation_id: str,
    payload: SimulationReplay,
) -> SimulationResponse:
    _require_openai()
    parent = store.simulations.get(simulation_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Simulation not found.")

    sim = start_simulation_task(
        candidate_id=parent.candidate_id,
        variant_ids=parent.variant_ids,
        interventions=payload.interventions,
        parent_simulation_id=simulation_id,
    )
    return SimulationResponse(simulation=sim)
