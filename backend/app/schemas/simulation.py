from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class AgentRole(str, Enum):
    RESUME_SCREENER = "resume_screener"
    RECRUITER = "recruiter"
    TECHNICAL_INTERVIEWER = "technical_interviewer"
    HIRING_MANAGER = "hiring_manager"
    BIAS_AUDITOR = "bias_auditor"


class SimulationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class InterventionFlags(BaseModel):
    blind_screening: bool = False
    structured_rubric: bool = False
    hidden_recruiter_notes: bool = False
    standardized_questions: bool = False


class Evaluation(BaseModel):
    variant_id: str
    agent: AgentRole
    score: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    callback_probability: float = Field(ge=0, le=1)
    rationale: str = ""
    assumptions: list[str] = Field(default_factory=list)


class Assumption(BaseModel):
    id: str
    source_agent: AgentRole
    variant_id: str
    text: str
    propagated_to: list[AgentRole] = Field(default_factory=list)


class TimelineNode(BaseModel):
    id: str
    agent: AgentRole
    variant_id: str
    x: float = 0
    y: float = 0
    merged: bool = True
    score: float = 0
    confidence: float = 0


class BranchEvent(BaseModel):
    id: str
    parent_node_id: str
    variant_id: str
    cause: str
    signal: str
    agent: AgentRole
    confidence_delta: float = 0


class SimulationRun(BaseModel):
    id: str
    candidate_id: str
    variant_ids: list[str]
    status: SimulationStatus = SimulationStatus.PENDING
    interventions: InterventionFlags = Field(default_factory=InterventionFlags)
    parent_simulation_id: str | None = None
    evaluations: list[Evaluation] = Field(default_factory=list)
    assumptions: list[Assumption] = Field(default_factory=list)
    timeline_nodes: list[TimelineNode] = Field(default_factory=list)
    branch_events: list[BranchEvent] = Field(default_factory=list)
    divergence_score: float = 0
    events: list[dict] = Field(default_factory=list)


class SimulationCreate(BaseModel):
    candidate_id: str
    variant_ids: list[str] | None = None
    interventions: InterventionFlags = Field(default_factory=InterventionFlags)


class SimulationReplay(BaseModel):
    interventions: InterventionFlags


class SimulationResponse(BaseModel):
    simulation: SimulationRun
