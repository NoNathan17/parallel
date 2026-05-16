from __future__ import annotations

import operator
from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages

from app.schemas.candidate import BaseCandidate
from app.schemas.simulation import (
    AgentRole,
    Assumption,
    BranchEvent,
    Evaluation,
    InterventionFlags,
    TimelineNode,
)
from app.schemas.variant import CandidateVariant


class GraphState(TypedDict):
    messages: Annotated[list, add_messages]


class SimulationState(TypedDict):
    simulation_id: str
    base_candidate: BaseCandidate
    variants: list[CandidateVariant]
    round: int
    agent_outputs: dict[str, list[Evaluation]]
    assumptions: Annotated[list[Assumption], operator.add]
    timeline_nodes: Annotated[list[TimelineNode], operator.add]
    branch_events: Annotated[list[BranchEvent], operator.add]
    interventions: InterventionFlags
    events: Annotated[list[dict], operator.add]
    divergence_score: float
    current_agent: AgentRole | None
