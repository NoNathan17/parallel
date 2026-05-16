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
from app.services.stream_emitter import emit, emit_staggered
from app.store import store

_graph = None


def get_simulation_graph():
    global _graph
    if _graph is None:
        _graph = build_simulation_graph()
    return _graph


def create_simulation(
    candidate_id: str,
    variant_ids: list[str] | None,
    interventions: InterventionFlags,
    parent_simulation_id: str | None = None,
) -> SimulationRun:
    """Create a pending simulation — does NOT run until begin_simulation()."""
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
    return sim


def begin_simulation(simulation_id: str) -> None:
    sim = store.simulations.get(simulation_id)
    if not sim:
        raise ValueError("Simulation not found")
    if sim.status != SimulationStatus.PENDING:
        return

    asyncio.create_task(
        run_simulation(
            simulation_id,
            sim.candidate_id,
            sim.variant_ids,
            sim.interventions,
            sim.parent_simulation_id,
        )
    )


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

    await emit(
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

    await emit(
        simulation_id,
        {
            "type": "timeline.trunk",
            "simulation_id": simulation_id,
            "payload": {
                "message": "Sacred timeline — all candidates technically identical",
                "x_start": 0.05,
                "x_end": 0.28,
                "y": 0.5,
            },
        },
        delay=0.5,
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

                round_events = node_output.get("events", [])
                priority = {
                    "agent.round_start": 0,
                    "agent.thinking": 1,
                    "agent.message": 2,
                    "agent.evaluation": 3,
                    "timeline.node": 4,
                    "timeline.branch": 5,
                    "bias.audit": 6,
                }
                round_events.sort(key=lambda e: priority.get(e.get("type", ""), 99))

                await emit_staggered(simulation_id, round_events)
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
            variant_callbacks[v.id] = hm_evals[-1].callback_probability if hm_evals else 0.5

        callbacks = list(variant_callbacks.values())
        callback_spread = max(callbacks) - min(callbacks) if callbacks else 0.0
        divergence = final_state.get("divergence_score", callback_spread)

        sim.status = SimulationStatus.COMPLETED
        sim.evaluations = all_evals
        sim.assumptions = final_state.get("assumptions", [])
        sim.timeline_nodes = final_state.get("timeline_nodes", [])
        sim.branch_events = final_state.get("branch_events", [])
        sim.divergence_score = divergence

        await emit(
            simulation_id,
            {
                "type": "simulation.completed",
                "simulation_id": simulation_id,
                "payload": {
                    "divergence_score": divergence,
                    "callback_spread": callback_spread,
                    "variant_callbacks": variant_callbacks,
                },
            },
        )

        if parent_simulation_id:
            parent = store.simulations.get(parent_simulation_id)
            if parent:
                prev_spread = parent.divergence_score
                if parent.events:
                    for e in reversed(parent.events):
                        if e.get("type") == "simulation.completed":
                            prev_spread = e.get("payload", {}).get("callback_spread", prev_spread)
                            break
                reduction = max(0, prev_spread - callback_spread)
                await emit(
                    simulation_id,
                    {
                        "type": "replay.completed",
                        "simulation_id": simulation_id,
                        "payload": {
                            "parent_simulation_id": parent_simulation_id,
                            "divergence_reduction": reduction,
                            "previous_divergence": parent.divergence_score,
                            "new_divergence": divergence,
                            "callback_spread_before": prev_spread,
                            "callback_spread_after": callback_spread,
                        },
                    },
                )

    except Exception as e:
        sim.status = SimulationStatus.FAILED
        await emit(
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
    *,
    auto_begin: bool = True,
) -> SimulationRun:
    sim = create_simulation(candidate_id, variant_ids, interventions, parent_simulation_id)
    if auto_begin:
        begin_simulation(sim.id)
    return sim
