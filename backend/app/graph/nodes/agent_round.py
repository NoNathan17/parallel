from __future__ import annotations

import json
import uuid
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from app.config import get_settings
from app.graph.interventions import apply_context_filters, intervention_prompt_suffix
from app.graph.state import SimulationState
from app.schemas.simulation import (
    AgentRole,
    Assumption,
    BranchEvent,
    Evaluation,
    TimelineNode,
)
from app.schemas.variant import VariantSignal

AGENT_ORDER = [
    AgentRole.RESUME_SCREENER,
    AgentRole.RECRUITER,
    AgentRole.TECHNICAL_INTERVIEWER,
    AgentRole.HIRING_MANAGER,
    AgentRole.BIAS_AUDITOR,
]

AGENT_LABELS = {
    AgentRole.RESUME_SCREENER: "Resume Screener",
    AgentRole.RECRUITER: "Recruiter",
    AgentRole.TECHNICAL_INTERVIEWER: "Technical Interviewer",
    AgentRole.HIRING_MANAGER: "Hiring Manager",
    AgentRole.BIAS_AUDITOR: "Bias Auditor",
}

# Horizontal sacred timeline: time flows left → right
STAGE_X = {
    AgentRole.RESUME_SCREENER: 0.12,
    AgentRole.RECRUITER: 0.32,
    AgentRole.TECHNICAL_INTERVIEWER: 0.52,
    AgentRole.HIRING_MANAGER: 0.72,
    AgentRole.BIAS_AUDITOR: 0.92,
}

BRANCH_STAGE = AgentRole.RECRUITER


class VariantEvalResult(BaseModel):
    variant_id: str
    score: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    callback_probability: float = Field(ge=0, le=1)
    rationale: str
    assumptions: list[str] = Field(default_factory=list)


class RoundOutput(BaseModel):
    evaluations: list[VariantEvalResult]
    branch_detected: bool = False
    branch_variant_id: str | None = None
    branch_cause: str = ""
    divergence_note: str = ""


def _build_assumption_bus(state: SimulationState) -> str:
    lines: list[str] = []
    for agent_key, evals in state.get("agent_outputs", {}).items():
        for ev in evals:
            if ev.assumptions:
                lines.append(f"[{agent_key}] variant {ev.variant_id}: " + "; ".join(ev.assumptions))
    for a in state.get("assumptions", []):
        lines.append(f"[assumption] {a.source_agent.value}: {a.text}")
    return "\n".join(lines) if lines else "No prior assumptions yet."


def _variant_context(variant: Any, interventions: Any, agent: AgentRole) -> str:
    overlay = apply_context_filters(variant, interventions, agent.value)
    return json.dumps(
        {
            "variant_id": variant.id,
            "label": variant.label,
            "signal": variant.signal.value,
            "changed_signal": variant.changed_signal,
            "context_overlay": overlay,
            "technical_summary": variant.technical_summary,
        },
        indent=2,
    )


def _branch_y(variant_index: int, total: int) -> float:
    """Spread branches vertically around center (0.5)."""
    if total <= 1:
        return 0.5
    center = (total - 1) / 2
    spread = 0.18
    return 0.5 + (variant_index - center) * spread


def _is_merged(agent: AgentRole, variant_signal: VariantSignal, branched: bool) -> bool:
    if agent == AgentRole.RESUME_SCREENER:
        return True
    if not branched:
        return True
    return variant_signal == VariantSignal.BASELINE and agent == BRANCH_STAGE


def _generate_dialogue(
    agent: AgentRole,
    evaluations: list[VariantEvalResult],
    variants: list[Any],
    simulation_id: str,
    prior_agent: AgentRole | None,
) -> list[dict]:
    """Synthesize inter-agent messages from evaluation outputs."""
    messages: list[dict] = []
    agent_val = agent.value

    if agent == AgentRole.RESUME_SCREENER:
        messages.append({
            "type": "agent.message",
            "simulation_id": simulation_id,
            "payload": {
                "from_agent": agent_val,
                "to_agent": "recruiter",
                "message": "All profiles pass technical bar. Forwarding identical skill signals — context overlays only.",
                "tone": "neutral",
            },
        })
        return messages

    baseline = next((e for e in evaluations if _variant_signal(variants, e.variant_id) == VariantSignal.BASELINE), None)

    if agent == AgentRole.RECRUITER:
        for ev in evaluations:
            sig = _variant_signal(variants, ev.variant_id)
            if sig == VariantSignal.BASELINE:
                continue
            if ev.confidence < 0.82:
                label = _variant_label(variants, ev.variant_id)
                messages.append({
                    "type": "agent.message",
                    "simulation_id": simulation_id,
                    "payload": {
                        "from_agent": agent_val,
                        "to_agent": "technical_interviewer",
                        "message": (
                            f"I'm less certain on '{label}' — {ev.rationale[:140]}"
                        ),
                        "tone": "concerned",
                        "variant_id": ev.variant_id,
                        "variant_label": label,
                    },
                })
        if prior_agent and baseline:
            messages.append({
                "type": "agent.message",
                "simulation_id": simulation_id,
                "payload": {
                    "from_agent": "resume_screener",
                    "to_agent": agent_val,
                    "message": "Scores were equivalent at screening. Any spread now is contextual, not technical.",
                    "tone": "neutral",
                },
            })

    if agent == AgentRole.TECHNICAL_INTERVIEWER:
        for ev in evaluations:
            sig = _variant_signal(variants, ev.variant_id)
            if sig == VariantSignal.BASELINE:
                continue
            label = _variant_label(variants, ev.variant_id)
            messages.append({
                "type": "agent.message",
                "simulation_id": simulation_id,
                "payload": {
                    "from_agent": agent_val,
                    "to_agent": "hiring_manager",
                    "message": (
                        f"Technical evidence for '{label}' does not justify lower confidence — "
                        f"but I'm probing deeper because of upstream notes."
                    ),
                    "tone": "pushback" if ev.score >= 75 else "aligned",
                    "variant_id": ev.variant_id,
                    "variant_label": label,
                },
            })
        messages.append({
            "type": "agent.message",
            "simulation_id": simulation_id,
            "payload": {
                "from_agent": "recruiter",
                "to_agent": agent_val,
                "message": "Please weight the rubric, but note communication polish flags in my notes.",
                "tone": "neutral",
            },
        })

    if agent == AgentRole.HIRING_MANAGER:
        callbacks = [(e.callback_probability, _variant_label(variants, e.variant_id)) for e in evaluations]
        spread = max(c for c, _ in callbacks) - min(c for c, _ in callbacks) if callbacks else 0
        messages.append({
            "type": "agent.message",
            "simulation_id": simulation_id,
            "payload": {
                "from_agent": agent_val,
                "to_agent": "bias_auditor",
                "message": (
                    f"Committee sees callback spread of {spread:.0%} despite equivalent technicals. "
                    "Flag if subjective drift propagated."
                ),
                "tone": "concerned",
            },
        })

    if agent == AgentRole.BIAS_AUDITOR:
        messages.append({
            "type": "agent.message",
            "simulation_id": simulation_id,
            "payload": {
                "from_agent": agent_val,
                "to_agent": "all",
                "message": "Audit complete. Divergence trace ready — technical equivalence held.",
                "tone": "neutral",
            },
        })

    return messages


def _variant_signal(variants: list[Any], variant_id: str) -> VariantSignal:
    v = next((x for x in variants if x.id == variant_id), None)
    return v.signal if v else VariantSignal.BASELINE


def _variant_label(variants: list[Any], variant_id: str) -> str:
    v = next((x for x in variants if x.id == variant_id), None)
    return v.label if v else variant_id[:8]


async def run_agent_round(state: SimulationState, agent: AgentRole) -> dict:
    settings = get_settings()
    model = ChatOpenAI(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        temperature=0.3,
    )
    structured = model.with_structured_output(RoundOutput)

    variants = state["variants"]
    interventions = state["interventions"]
    base = state["base_candidate"]
    assumption_bus = _build_assumption_bus(state)
    intervention_suffix = intervention_prompt_suffix(interventions)
    simulation_id = state["simulation_id"]

    prior_agents = list(state.get("agent_outputs", {}).keys())
    prior_agent = AgentRole(prior_agents[-1]) if prior_agents else None

    events: list[dict] = [
        {
            "type": "agent.round_start",
            "simulation_id": simulation_id,
            "payload": {"agent": agent.value, "label": AGENT_LABELS[agent]},
        },
        {
            "type": "agent.thinking",
            "simulation_id": simulation_id,
            "payload": {"agent": agent.value, "message": f"{AGENT_LABELS[agent]} is evaluating all parallel tracks…"},
        },
    ]

    variant_blocks = "\n\n---\n\n".join(
        _variant_context(v, interventions, agent) for v in variants
    )

    is_auditor = agent == AgentRole.BIAS_AUDITOR
    role_instruction = (
        "You are the Bias Auditor. Compare all variant tracks. Technical ability is IDENTICAL. "
        "Identify where subjective drift started, which agent amplified it, and causal chain. "
        "Set divergence_note to a clear causal summary."
        if is_auditor
        else (
            f"You are the {AGENT_LABELS[agent]}. Evaluate ALL variants in one pass. "
            "Technical skills are equivalent—only contextual signals differ. "
            "At recruiter stage, realistic bias may create confidence gaps. "
            "Return one evaluation per variant_id."
        )
    )

    prompt = f"""{role_instruction}

BASE: {base.name} — {base.technical_summary}

ASSUMPTION BUS:
{assumption_bus}

VARIANTS:
{variant_blocks}

INTERVENTIONS: {intervention_suffix or "None"}
"""

    result: RoundOutput = await structured.ainvoke(
        [SystemMessage(content=role_instruction), HumanMessage(content=prompt)]
    )

    returned_ids = {e.variant_id for e in result.evaluations}
    for v in variants:
        if v.id not in returned_ids:
            result.evaluations.append(
                VariantEvalResult(
                    variant_id=v.id,
                    score=75.0,
                    confidence=0.7,
                    callback_probability=0.65,
                    rationale=f"Evaluation for {v.label}",
                    assumptions=[],
                )
            )

    branch_index = AGENT_ORDER.index(BRANCH_STAGE)
    agent_index = AGENT_ORDER.index(agent)
    confidences = [e.confidence for e in result.evaluations]
    confidence_spread = (max(confidences) - min(confidences)) if confidences else 0.0

    branched = bool(state.get("branch_events")) or agent_index > branch_index
    if agent == BRANCH_STAGE and confidence_spread > 0.08:
        branched = True  # divergence visible at branch point

    evaluations: list[Evaluation] = []
    timeline_nodes: list[TimelineNode] = []
    branch_events: list[BranchEvent] = []
    assumptions: list[Assumption] = []
    agent_outputs = dict(state.get("agent_outputs", {}))

    variant_index_map = {v.id: i for i, v in enumerate(variants)}
    total = len(variants)

    for i, ev in enumerate(result.evaluations):
        variant = next((v for v in variants if v.id == ev.variant_id), variants[i])
        vi = variant_index_map.get(variant.id, i)

        merged = _is_merged(agent, variant.signal, branched)
        y_pos = 0.5 if merged else _branch_y(vi, total)
        x_pos = STAGE_X[agent]

        evaluation = Evaluation(
            variant_id=ev.variant_id,
            agent=agent,
            score=ev.score,
            confidence=ev.confidence,
            callback_probability=ev.callback_probability,
            rationale=ev.rationale,
            assumptions=ev.assumptions,
        )
        evaluations.append(evaluation)

        node_id = str(uuid.uuid4())
        timeline_nodes.append(
            TimelineNode(
                id=node_id,
                agent=agent,
                variant_id=ev.variant_id,
                x=x_pos,
                y=y_pos,
                merged=merged,
                score=ev.score,
                confidence=ev.confidence,
            )
        )

        events.append(
            {
                "type": "agent.evaluation",
                "simulation_id": simulation_id,
                "payload": {
                    "agent": agent.value,
                    "variant_id": ev.variant_id,
                    "variant_label": variant.label,
                    "score": ev.score,
                    "confidence": ev.confidence,
                    "callback_probability": ev.callback_probability,
                    "rationale": ev.rationale,
                    "assumptions": ev.assumptions,
                },
            }
        )
        events.append(
            {
                "type": "timeline.node",
                "simulation_id": simulation_id,
                "payload": {
                    "node_id": node_id,
                    "agent": agent.value,
                    "variant_id": ev.variant_id,
                    "variant_label": variant.label,
                    "x": x_pos,
                    "y": y_pos,
                    "merged": merged,
                    "score": ev.score,
                    "confidence": ev.confidence,
                },
            }
        )

        for assumption_text in ev.assumptions:
            assumptions.append(
                Assumption(
                    id=str(uuid.uuid4()),
                    source_agent=agent,
                    variant_id=ev.variant_id,
                    text=assumption_text,
                )
            )

    # Branch events at recruiter when divergence appears
    if agent == BRANCH_STAGE:
        baseline_conf = next(
            (e.confidence for e in result.evaluations if _variant_signal(variants, e.variant_id) == VariantSignal.BASELINE),
            0.75,
        )
        for ev in result.evaluations:
            if _variant_signal(variants, ev.variant_id) == VariantSignal.BASELINE:
                continue
            if ev.confidence < baseline_conf - 0.05:
                variant = next(v for v in variants if v.id == ev.variant_id)
                branch_id = str(uuid.uuid4())
                cause = result.branch_cause or ev.rationale[:100]
                branch_events.append(
                    BranchEvent(
                        id=branch_id,
                        parent_node_id="sacred_timeline",
                        variant_id=ev.variant_id,
                        cause=cause,
                        signal=variant.changed_signal,
                        agent=agent,
                        confidence_delta=ev.confidence - baseline_conf,
                    )
                )
                events.append(
                    {
                        "type": "timeline.branch",
                        "simulation_id": simulation_id,
                        "payload": {
                            "branch_id": branch_id,
                            "parent_node_id": "sacred_timeline",
                            "variant_id": ev.variant_id,
                            "variant_label": variant.label,
                            "cause": cause,
                            "signal": variant.changed_signal,
                            "agent": agent.value,
                            "confidence_delta": ev.confidence - baseline_conf,
                            "branch_y": _branch_y(variant_index_map.get(ev.variant_id, 0), total),
                            "branch_x": STAGE_X[BRANCH_STAGE],
                        },
                    }
                )

    events.extend(_generate_dialogue(agent, result.evaluations, variants, simulation_id, prior_agent))

    agent_outputs[agent.value] = evaluations

    divergence = 0.0
    if evaluations:
        callbacks = [e.callback_probability for e in evaluations]
        divergence = max(callbacks) - min(callbacks) if callbacks else 0.0

    if agent == AgentRole.BIAS_AUDITOR:
        summary = result.divergence_note or (
            result.evaluations[0].rationale if result.evaluations else ""
        )
        events.append(
            {
                "type": "bias.audit",
                "simulation_id": simulation_id,
                "payload": {
                    "divergence_start_agent": AgentRole.RECRUITER.value,
                    "divergence_start_variant": variants[1].id if len(variants) > 1 else variants[0].id,
                    "amplifier_agent": AgentRole.TECHNICAL_INTERVIEWER.value,
                    "signal_caused": variants[1].changed_signal if len(variants) > 1 else "",
                    "summary": summary,
                    "technical_equivalence_maintained": True,
                },
            }
        )

    return {
        "agent_outputs": agent_outputs,
        "assumptions": assumptions,
        "timeline_nodes": timeline_nodes,
        "branch_events": branch_events,
        "events": events,
        "divergence_score": divergence,
        "current_agent": agent,
    }
