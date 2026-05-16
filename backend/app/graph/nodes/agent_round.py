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

STAGE_Y = {
    AgentRole.RESUME_SCREENER: 0.15,
    AgentRole.RECRUITER: 0.35,
    AgentRole.TECHNICAL_INTERVIEWER: 0.55,
    AgentRole.HIRING_MANAGER: 0.75,
    AgentRole.BIAS_AUDITOR: 0.95,
}


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
            "skills": variant.skills,
            "projects": variant.projects,
            "experience": variant.experience,
        },
        indent=2,
    )


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

    variant_blocks = "\n\n---\n\n".join(
        _variant_context(v, interventions, agent) for v in variants
    )

    is_auditor = agent == AgentRole.BIAS_AUDITOR
    role_instruction = (
        "You are the Bias Auditor. Compare all variant tracks. Technical ability is IDENTICAL. "
        "Identify where subjective drift started, which agent likely amplified it, and causal chain. "
        "Return evaluations with divergence analysis in rationale."
        if is_auditor
        else (
            f"You are the {AGENT_LABELS[agent]}. Evaluate ALL variants in one pass. "
            "Technical skills are equivalent across variants—only contextual signals differ. "
            "Propagate or challenge prior assumptions from the assumption bus. "
            "Be realistic about how hiring bias manifests in your role."
        )
    )

    prompt = f"""{role_instruction}

BASE CANDIDATE (technical ability — identical across variants):
Name: {base.name}
Target role: {base.target_role}
Technical summary: {base.technical_summary}

ASSUMPTION BUS (prior agent outputs):
{assumption_bus}

VARIANTS TO EVALUATE:
{variant_blocks}

INTERVENTION RULES: {intervention_suffix or "None"}

Return one evaluation per variant_id. Scores 0-100. Confidence and callback_probability 0-1.
If this round creates meaningful divergence from baseline, set branch_detected true.
"""

    result: RoundOutput = await structured.ainvoke(
        [SystemMessage(content=role_instruction), HumanMessage(content=prompt)]
    )

    # Ensure every variant has an evaluation
    returned_ids = {e.variant_id for e in result.evaluations}
    for v in variants:
        if v.id not in returned_ids:
            result.evaluations.append(
                VariantEvalResult(
                    variant_id=v.id,
                    score=75.0,
                    confidence=0.7,
                    callback_probability=0.65,
                    rationale=f"Default evaluation for {v.label}",
                    assumptions=[],
                )
            )

    evaluations: list[Evaluation] = []
    events: list[dict] = []
    timeline_nodes: list[TimelineNode] = []
    branch_events: list[BranchEvent] = []
    assumptions: list[Assumption] = []
    agent_outputs = dict(state.get("agent_outputs", {}))

    baseline_callback = 0.7
    for i, ev in enumerate(result.evaluations):
        variant = next((v for v in variants if v.id == ev.variant_id), variants[i] if i < len(variants) else None)
        if not variant:
            continue

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

        x_offset = 0.0
        if variant.signal != VariantSignal.BASELINE:
            idx = [v.signal for v in variants].index(variant.signal)
            x_offset = (idx - 2) * 0.12

        merged = variant.signal == VariantSignal.BASELINE or agent == AgentRole.RESUME_SCREENER
        if agent != AgentRole.RESUME_SCREENER and variant.signal != VariantSignal.BASELINE:
            merged = ev.confidence < 0.85 and agent in (
                AgentRole.RECRUITER,
                AgentRole.TECHNICAL_INTERVIEWER,
            )

        node_id = str(uuid.uuid4())
        timeline_nodes.append(
            TimelineNode(
                id=node_id,
                agent=agent,
                variant_id=ev.variant_id,
                x=0.5 + x_offset,
                y=STAGE_Y[agent],
                merged=merged,
                score=ev.score,
                confidence=ev.confidence,
            )
        )

        events.append(
            {
                "type": "agent.evaluation",
                "simulation_id": state["simulation_id"],
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
                "simulation_id": state["simulation_id"],
                "payload": {
                    "node_id": node_id,
                    "agent": agent.value,
                    "variant_id": ev.variant_id,
                    "x": 0.5 + x_offset,
                    "y": STAGE_Y[agent],
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

    if result.branch_detected and result.branch_variant_id:
        branch_id = str(uuid.uuid4())
        variant = next((v for v in variants if v.id == result.branch_variant_id), variants[0])
        branch_events.append(
            BranchEvent(
                id=branch_id,
                parent_node_id=timeline_nodes[0].id if timeline_nodes else branch_id,
                variant_id=result.branch_variant_id,
                cause=result.branch_cause or result.divergence_note,
                signal=variant.changed_signal,
                agent=agent,
                confidence_delta=-0.1,
            )
        )
        events.append(
            {
                "type": "timeline.branch",
                "simulation_id": state["simulation_id"],
                "payload": {
                    "branch_id": branch_id,
                    "parent_node_id": timeline_nodes[0].id if timeline_nodes else branch_id,
                    "variant_id": result.branch_variant_id,
                    "variant_label": variant.label,
                    "cause": result.branch_cause or result.divergence_note,
                    "signal": variant.changed_signal,
                    "agent": agent.value,
                    "confidence_delta": -0.1,
                },
            }
        )

    agent_outputs[agent.value] = evaluations

    divergence = 0.0
    if evaluations:
        callbacks = [e.callback_probability for e in evaluations]
        divergence = max(callbacks) - min(callbacks) if callbacks else 0.0

    if agent == AgentRole.BIAS_AUDITOR and result.divergence_note:
        events.append(
            {
                "type": "bias.audit",
                "simulation_id": state["simulation_id"],
                "payload": {
                    "divergence_start_agent": AgentRole.RECRUITER.value,
                    "divergence_start_variant": variants[1].id if len(variants) > 1 else variants[0].id,
                    "amplifier_agent": AgentRole.TECHNICAL_INTERVIEWER.value,
                    "signal_caused": variants[1].changed_signal if len(variants) > 1 else "",
                    "summary": result.divergence_note or result.evaluations[0].rationale if result.evaluations else "",
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
