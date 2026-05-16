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


def _emit_node_output(node_output: dict[str, Any]) -> list[str]:
    payloads: list[str] = []
    for event in node_output.get("events") or []:
        payloads.append(_sse_payload(dict(event)))
    if node_output.get("final_feedback"):
        payloads.append(
            _sse_payload(
                {
                    "type": "final_feedback",
                    "feedback": _to_camel_feedback(node_output["final_feedback"]),
                }
            )
        )
    return payloads


async def stream_simulation(
    graph: CompiledStateGraph,
    raw_resume_text: str,
    target_role: str,
    *,
    event_delay: float = 0.05,
) -> AsyncIterator[str]:
    state: SimulationState = initial_state(raw_resume_text, target_role)

    async for chunk in graph.astream(state, stream_mode=["updates", "custom"]):
        if isinstance(chunk, tuple) and len(chunk) == 3:
            _namespace, mode, data = chunk
        elif isinstance(chunk, tuple) and len(chunk) == 2:
            mode, data = chunk
        else:
            mode, data = "updates", chunk

        if mode == "custom" and isinstance(data, dict):
            yield _sse_payload(data)
            continue

        if mode == "updates" and isinstance(data, dict):
            for _node_name, node_output in data.items():
                if not isinstance(node_output, dict):
                    continue
                for payload in _emit_node_output(node_output):
                    yield payload
                    await asyncio.sleep(event_delay)

    yield _sse_payload({"type": "simulation_done"})
