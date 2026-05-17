"""API request/response models and event type catalog for the frontend."""

from pydantic import BaseModel, Field

from app.simulation.interventions import VALID_INTERVENTIONS


class SimulateRequest(BaseModel):
    resumeText: str = Field(..., min_length=1)
    targetRole: str = Field(..., min_length=1)
    interventions: list[str] = Field(default_factory=list)
    isReplay: bool = False


class SimulationEventCatalog(BaseModel):
    """Document of SSE event types the frontend should handle."""

    eventTypes: list[str] = Field(
        default=[
            "simulation_started",
            "tick",
            "intervention_applied",
            "intervention_result",
            "stage_entered",
            "stage_completed",
            "candidate_created",
            "candidate_stage_started",
            "agent_message",
            "agent_message_start",
            "agent_message_delta",
            "agent_message_end",
            "score_update",
            "branch_detected",
            "assumption_propagated",
            "bias_audit_flag",
            "stage_evaluation",
            "audit_review",
            "audit_summary",
            "final_feedback",
            "simulation_done",
        ]
    )
    validInterventions: list[str] = Field(default=sorted(VALID_INTERVENTIONS))
