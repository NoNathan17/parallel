from __future__ import annotations

import asyncio
from typing import Any

from app.config import get_settings
from app.services.connection_manager import ws_manager
from app.store import store


def _delays() -> dict[str, float]:
    s = get_settings()
    return {
        "agent.round_start": s.simulation_stage_pause * 0.5,
        "agent.thinking": s.simulation_stage_pause * 0.7,
        "agent.message": s.simulation_message_pause,
        "agent.evaluation": s.simulation_node_pause,
        "timeline.node": s.simulation_node_pause * 0.85,
        "timeline.branch": s.simulation_branch_pause,
        "timeline.trunk": s.simulation_stage_pause * 0.4,
        "bias.audit": s.simulation_stage_pause,
        "simulation.completed": s.simulation_stage_pause,
        "replay.completed": s.simulation_stage_pause,
    }


async def emit(simulation_id: str, event: dict[str, Any], delay: float = 0) -> None:
    if delay > 0:
        await asyncio.sleep(delay)

    queue = store.get_or_create_queue(simulation_id)
    await queue.put(event)

    sim = store.simulations.get(simulation_id)
    if sim:
        sim.events.append(event)

    await ws_manager.broadcast(simulation_id, event)


def delay_for_event(event: dict[str, Any]) -> float:
    return _delays().get(event.get("type", ""), get_settings().simulation_node_pause * 0.3)


async def emit_staggered(simulation_id: str, events: list[dict]) -> None:
    """Emit events one-by-one with pacing for slow-motion branching."""
    variant_node_index = 0
    for event in events:
        delay = delay_for_event(event)
        if event.get("type") == "timeline.node":
            # Stagger each variant's node so branches grow one at a time
            delay += variant_node_index * get_settings().simulation_node_pause * 0.6
            variant_node_index += 1
        elif event.get("type") != "timeline.node":
            variant_node_index = 0

        await emit(simulation_id, event, delay=delay)


async def paced_replay_to_websocket(simulation_id: str, websocket: Any) -> None:
    """Replay history with the same pacing (late joiners only)."""
    sim = store.simulations.get(simulation_id)
    if not sim or not sim.events:
        return
    for event in sim.events:
        await asyncio.sleep(delay_for_event(event))
        try:
            await websocket.send_json(event)
        except Exception:
            break
