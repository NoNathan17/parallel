from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.simulation import AgentRole, InterventionFlags


class SSEEvent(BaseModel):
    type: str
    simulation_id: str
    payload: dict[str, Any] = Field(default_factory=dict)

    def to_sse_data(self) -> str:
        import json

        return json.dumps(self.model_dump())


class SimulationStartedPayload(BaseModel):
    candidate_id: str
    variant_ids: list[str]
    interventions: InterventionFlags


class AgentEvaluationPayload(BaseModel):
    agent: AgentRole
    variant_id: str
    variant_label: str
    score: float
    confidence: float
    callback_probability: float
    rationale: str
    assumptions: list[str] = Field(default_factory=list)


class TimelineNodePayload(BaseModel):
    node_id: str
    agent: AgentRole
    variant_id: str
    x: float
    y: float
    merged: bool
    score: float
    confidence: float


class TimelineBranchPayload(BaseModel):
    branch_id: str
    parent_node_id: str
    variant_id: str
    variant_label: str
    cause: str
    signal: str
    agent: AgentRole
    confidence_delta: float


class BiasAuditPayload(BaseModel):
    divergence_start_agent: AgentRole
    divergence_start_variant: str
    amplifier_agent: AgentRole
    signal_caused: str
    summary: str
    technical_equivalence_maintained: bool = True


class SimulationCompletedPayload(BaseModel):
    divergence_score: float
    callback_spread: float
    variant_callbacks: dict[str, float]


class ReplayCompletedPayload(BaseModel):
    parent_simulation_id: str
    divergence_reduction: float
    previous_divergence: float
    new_divergence: float
    callback_spread_before: float
    callback_spread_after: float
