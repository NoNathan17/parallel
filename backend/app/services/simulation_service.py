import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

from langgraph.graph.state import CompiledStateGraph

from app.graph.builder import initial_state
from app.schemas import CandidateVariant, SimulationState
from app.scoring import score_hiring_manager, score_technical_interviewer
from app.simulation.branching import fairness_metrics
from app.simulation.context import clear_emitter, set_emitter
from app.simulation.emitter import SimulationEmitter
from app.simulation.interventions import (
    INTERVENTION_LABELS,
    intervention_impact_summary,
    normalize_interventions,
)


def _to_camel_feedback(feedback: dict[str, Any]) -> dict[str, Any]:
    result = {
        "summary": feedback.get("summary", ""),
        "keyFindings": feedback.get("key_findings", []),
        "divergencePoints": feedback.get("divergence_points", []),
        "suggestedInterventions": feedback.get("suggested_interventions", []),
        "fairnessDeltaPlaceholder": feedback.get("fairness_delta_placeholder", ""),
    }
    if feedback.get("fairness_metrics"):
        result["fairnessMetrics"] = feedback["fairness_metrics"]
    return result


def _sse_payload(data: dict[str, Any]) -> str:
    return f"data: {json.dumps(data)}\n\n"


def _enrich_static_event(event: dict[str, Any], emitter: SimulationEmitter) -> dict[str, Any]:
    if "seq" in event:
        return event
    return emitter._envelope(event)


def _unadjusted_final_scores(
    candidates: list[CandidateVariant],
    final_scores: dict[str, dict[str, float]],
) -> dict[str, dict[str, float]]:
    """Hiring-manager scores without intervention adjustments (for replay comparison)."""
    result: dict[str, dict[str, float]] = {}
    for c in candidates:
        cid = c["id"]
        prior = final_scores.get(cid, score_technical_interviewer(c))
        result[cid] = score_hiring_manager(c, prior)
    return result


def _emit_node_output(node_output: dict[str, Any], emitter: SimulationEmitter) -> list[str]:
    payloads: list[str] = []
    for event in node_output.get("events") or []:
        enriched = _enrich_static_event(dict(event), emitter)
        payloads.append(_sse_payload(enriched))
    if node_output.get("final_feedback"):
        payloads.append(
            _sse_payload(
                {
                    "type": "final_feedback",
                    "feedback": _to_camel_feedback(node_output["final_feedback"]),
                    "simulationId": emitter.simulation_id,
                }
            )
        )
    return payloads


async def stream_simulation(
    graph: CompiledStateGraph,
    raw_resume_text: str,
    target_role: str,
    *,
    interventions: list[str] | None = None,
    is_replay: bool = False,
    event_delay: float = 0.03,
    step_delay: float = 0.08,
) -> AsyncIterator[str]:
    normalized = normalize_interventions(interventions)
    simulation_id = str(uuid.uuid4())
    state: SimulationState = initial_state(
        raw_resume_text,
        target_role,
        simulation_id=simulation_id,
        interventions=normalized,
        is_replay=is_replay,
    )

    emitter = SimulationEmitter(
        simulation_id=simulation_id,
        interventions=normalized,
        is_replay=is_replay,
    )
    set_emitter(emitter)

    candidates_cache: list[CandidateVariant] = []

    try:
        yield _sse_payload(
            emitter.simulation_started(
                target_role=target_role,
                candidate_ids=[],
                stages=state.get("stages") or [],
            )
        )
        await asyncio.sleep(step_delay)

        for intervention_id in normalized:
            label = INTERVENTION_LABELS.get(intervention_id, intervention_id)
            yield _sse_payload(emitter.intervention_applied(intervention_id, label))
            await asyncio.sleep(step_delay)

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

                    if node_output.get("candidates"):
                        candidates_cache = node_output["candidates"]

                    for payload in _emit_node_output(node_output, emitter):
                        yield payload
                        await asyncio.sleep(event_delay)

                    final_scores = node_output.get("stage_scores")
                    if (
                        normalized
                        and final_scores
                        and node_output.get("final_feedback")
                        and candidates_cache
                    ):
                        metrics_after = fairness_metrics(final_scores)
                        metrics_before = fairness_metrics(
                            _unadjusted_final_scores(candidates_cache, final_scores)
                        )
                        impact = intervention_impact_summary(metrics_before, metrics_after)
                        yield _sse_payload(emitter._envelope(impact))
                        await asyncio.sleep(step_delay)

        yield _sse_payload(
            emitter._envelope(
                {
                    "type": "simulation_done",
                    "simulationId": simulation_id,
                    "branchedCandidates": list(emitter.branched_candidates),
                    "totalSteps": emitter.timeline_step,
                }
            )
        )
    finally:
        clear_emitter()
