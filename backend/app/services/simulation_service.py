import asyncio
import json
from collections.abc import AsyncIterator
from typing import Any

from langgraph.graph.state import CompiledStateGraph

from app.graph.builder import initial_state
from app.schemas import SimulationState, TimelineEvent


def _to_camel_feedback(feedback: dict[str, Any]) -> dict[str, Any]:
    return {
        "summary": feedback.get("summary", ""),
        "keyFindings": feedback.get("key_findings", []),
        "divergencePoints": feedback.get("divergence_points", []),
        "suggestedInterventions": feedback.get("suggested_interventions", []),
        "fairnessDeltaPlaceholder": feedback.get("fairness_delta_placeholder", ""),
    }


def _sse_payload(data: dict[str, Any]) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def stream_simulation(
    graph: CompiledStateGraph,
    raw_resume_text: str,
    target_role: str,
    *,
    event_delay: float = 0.12,
) -> AsyncIterator[str]:
    state: SimulationState = initial_state(raw_resume_text, target_role)

    async for update in graph.astream(state, stream_mode="updates"):
        for _node_name, node_output in update.items():
            if not isinstance(node_output, dict):
                continue
            new_events: list[TimelineEvent] = node_output.get("events") or []
            for event in new_events:
                yield _sse_payload(dict(event))
                await asyncio.sleep(event_delay)

            if node_output.get("final_feedback"):
                yield _sse_payload(
                    {
                        "type": "final_feedback",
                        "feedback": _to_camel_feedback(node_output["final_feedback"]),
                    }
                )
                await asyncio.sleep(event_delay)

    yield _sse_payload({"type": "simulation_done"})
