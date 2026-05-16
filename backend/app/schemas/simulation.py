from typing import Any, NotRequired, TypedDict


class ParsedResume(TypedDict):
    name: str
    email: str
    education: list[str]
    skills: list[str]
    projects: list[str]
    experience: list[str]
    summary: str


class CandidateVariant(TypedDict):
    id: str
    name: str
    variant: str
    signal: str
    resume_snapshot: str
    hidden_context: dict[str, Any]


class TimelineEvent(TypedDict, total=False):
    type: str
    stage: str
    stageIndex: int
    candidateId: NotRequired[str]
    candidateName: NotRequired[str]
    variant: NotRequired[str]
    sourceAgent: str
    targetAgent: str
    message: str
    stageFeedback: str
    confidence: NotRequired[float]
    callbackProbability: NotRequired[float]
    technicalScore: NotRequired[float]
    subjectiveScore: NotRequired[float]
    assumptionTags: NotRequired[list[str]]
    branchReason: NotRequired[str]
    timestamp: str


class FinalFeedback(TypedDict):
    summary: str
    key_findings: list[str]
    divergence_points: list[str]
    suggested_interventions: list[str]
    fairness_delta_placeholder: str


class SimulationState(TypedDict, total=False):
    target_role: str
    raw_resume_text: str
    parsed_resume: ParsedResume | None
    candidates: list[CandidateVariant]
    stages: list[str]
    events: list[TimelineEvent]
    final_feedback: FinalFeedback | None
    current_stage_index: int
    stage_scores: dict[str, dict[str, dict[str, float]]]
