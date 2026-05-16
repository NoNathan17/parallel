from __future__ import annotations

import asyncio
import uuid
from typing import Any

from app.graph.simulation_builder import build_simulation_graph
from app.schemas.simulation import (
    InterventionFlags,
    SimulationRun,
    SimulationStatus,
)
from app.store import store

_graph = None


def get_simulation_graph():
    global _graph
    if _graph is None:
        _graph = build_simulation_graph()
    return _graph


async def _emit(simulation_id: str, event: dict) -> None:
    queue = store.get_or_create_queue(simulation_id)
    await queue.put(event)
    sim = store.simulations.get(simulation_id)
    if sim:
        sim.events.append(event)


async def run_simulation(
    simulation_id: str,
    candidate_id: str,
    variant_ids: list[str],
    interventions: InterventionFlags,
    parent_simulation_id: str | None = None,
) -> None:
    candidate = store.candidates.get(candidate_id)
    if not candidate:
        return

    variants = [store.variants[vid] for vid in variant_ids if vid in store.variants]
    if not variants:
        return

    sim = store.simulations[simulation_id]
    sim.status = SimulationStatus.RUNNING

    await _emit(
        simulation_id,
        {
            "type": "simulation.started",
            "simulation_id": simulation_id,
            "payload": {
                "candidate_id": candidate_id,
                "variant_ids": variant_ids,
                "interventions": interventions.model_dump(),
            },
        },
    )

    initial_state = {
        "simulation_id": simulation_id,
        "base_candidate": candidate,
        "variants": variants,
        "round": 0,
        "agent_outputs": {},
        "assumptions": [],
        "timeline_nodes": [],
        "branch_events": [],
        "interventions": interventions,
        "events": [],
        "divergence_score": 0.0,
        "current_agent": None,
    }

    try:
        graph = get_simulation_graph()
        final_state: dict[str, Any] = initial_state

        async for chunk in graph.astream(initial_state):
            for _node_name, node_output in chunk.items():
                if not isinstance(node_output, dict):
                    continue
                for event in node_output.get("events", []):
                    await _emit(simulation_id, event)
                final_state = {**final_state, **node_output}

        agent_outputs = final_state.get("agent_outputs", {})
        all_evals = []
        for evals in agent_outputs.values():
            all_evals.extend(evals)

        variant_callbacks: dict[str, float] = {}
        for v in variants:
            hm_evals = [
                e for e in agent_outputs.get("hiring_manager", [])
                if e.variant_id == v.id
            ]
            if hm_evals:
                variant_callbacks[v.id] = hm_evals[-1].callback_probability
            else:
                variant_callbacks[v.id] = 0.5

        callbacks = list(variant_callbacks.values())
        callback_spread = max(callbacks) - min(callbacks) if callbacks else 0.0
        divergence = final_state.get("divergence_score", callback_spread)

        sim.status = SimulationStatus.COMPLETED
        sim.evaluations = all_evals
        sim.assumptions = final_state.get("assumptions", [])
        sim.timeline_nodes = final_state.get("timeline_nodes", [])
        sim.branch_events = final_state.get("branch_events", [])
        sim.divergence_score = divergence

        completed_event = {
            "type": "simulation.completed",
            "simulation_id": simulation_id,
            "payload": {
                "divergence_score": divergence,
                "callback_spread": callback_spread,
                "variant_callbacks": variant_callbacks,
            },
        }
        await _emit(simulation_id, completed_event)

        if parent_simulation_id:
            parent = store.simulations.get(parent_simulation_id)
            if parent:
                prev_spread = 0.0
                prev_div = parent.divergence_score
                if parent.events:
                    for e in reversed(parent.events):
                        if e.get("type") == "simulation.completed":
                            prev_spread = e.get("payload", {}).get("callback_spread", prev_div)
                            break
                reduction = max(0, prev_spread - callback_spread)
                await _emit(
                    simulation_id,
                    {
                        "type": "replay.completed",
                        "simulation_id": simulation_id,
                        "payload": {
                            "parent_simulation_id": parent_simulation_id,
                            "divergence_reduction": reduction,
                            "previous_divergence": prev_div,
                            "new_divergence": divergence,
                            "callback_spread_before": prev_spread,
                            "callback_spread_after": callback_spread,
                        },
                    },
                )

    except Exception as e:
        sim.status = SimulationStatus.FAILED
        await _emit(
            simulation_id,
            {
                "type": "simulation.failed",
                "simulation_id": simulation_id,
                "payload": {"error": str(e)},
            },
        )
    finally:
        queue = store.get_or_create_queue(simulation_id)
        await queue.put(None)


def start_simulation_task(
    candidate_id: str,
    variant_ids: list[str] | None,
    interventions: InterventionFlags,
    parent_simulation_id: str | None = None,
) -> SimulationRun:
    if variant_ids is None:
        variant_ids = store.get_variant_ids(candidate_id)

    simulation_id = str(uuid.uuid4())
    sim = SimulationRun(
        id=simulation_id,
        candidate_id=candidate_id,
        variant_ids=variant_ids,
        status=SimulationStatus.PENDING,
        interventions=interventions,
        parent_simulation_id=parent_simulation_id,
    )
    store.simulations[simulation_id] = sim
    store.get_or_create_queue(simulation_id)

    asyncio.create_task(
        run_simulation(
            simulation_id,
            candidate_id,
            variant_ids,
            interventions,
            parent_simulation_id,
        )
    )

    return sim
