from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.schemas.simulation import (
    SimulationCreate,
    SimulationReplay,
    SimulationResponse,
    SimulationStatus,
)
from app.services.connection_manager import ws_manager
from app.services.simulation_service import (
    begin_simulation,
    create_simulation,
    start_simulation_task,
)
from app.services.stream_emitter import paced_replay_to_websocket
from app.store import store

router = APIRouter()


def _require_openai() -> None:
    if not get_settings().openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured.")


@router.post("", response_model=SimulationResponse)
async def create_simulation_endpoint(payload: SimulationCreate) -> SimulationResponse:
    _require_openai()
    if payload.candidate_id not in store.candidates:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    variant_ids = payload.variant_ids or store.get_variant_ids(payload.candidate_id)
    if not variant_ids:
        raise HTTPException(status_code=400, detail="No variants found. Generate variants first.")

    # Do not auto-run — client connects stream then calls /start
    sim = create_simulation(
        candidate_id=payload.candidate_id,
        variant_ids=variant_ids,
        interventions=payload.interventions,
    )
    return SimulationResponse(simulation=sim)


@router.post("/{simulation_id}/start", response_model=SimulationResponse)
async def start_simulation_endpoint(simulation_id: str) -> SimulationResponse:
    sim = store.simulations.get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found.")
    if sim.status == SimulationStatus.PENDING:
        begin_simulation(simulation_id)
    return SimulationResponse(simulation=store.simulations[simulation_id])


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


@router.websocket("/{simulation_id}/ws")
async def simulation_websocket(websocket: WebSocket, simulation_id: str) -> None:
    if simulation_id not in store.simulations:
        await websocket.close(code=4004)
        return

    await ws_manager.connect(simulation_id, websocket)
    sim = store.simulations[simulation_id]

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json(
                    {"type": "pong", "simulation_id": simulation_id, "payload": {}}
                )
            elif data == "ready":
                if sim.status == SimulationStatus.PENDING:
                    begin_simulation(simulation_id)
                elif sim.status == SimulationStatus.COMPLETED:
                    await paced_replay_to_websocket(simulation_id, websocket)
    except WebSocketDisconnect:
        ws_manager.disconnect(simulation_id, websocket)


@router.post("/{simulation_id}/replay", response_model=SimulationResponse)
async def replay_simulation(
    simulation_id: str,
    payload: SimulationReplay,
) -> SimulationResponse:
    _require_openai()
    parent = store.simulations.get(simulation_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Simulation not found.")

    sim = create_simulation(
        candidate_id=parent.candidate_id,
        variant_ids=parent.variant_ids,
        interventions=payload.interventions,
        parent_simulation_id=simulation_id,
    )
    return SimulationResponse(simulation=sim)
