from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class VariantSignal(str, Enum):
    BASELINE = "baseline"
    NONTRADITIONAL_BACKGROUND = "nontraditional_background"
    NO_REFERRAL = "no_referral"
    ESL_COMMUNICATION = "esl_communication"
    SCHOOL_PRESTIGE = "school_prestige"


SIGNAL_LABELS: dict[VariantSignal, str] = {
    VariantSignal.BASELINE: "Baseline (control)",
    VariantSignal.NONTRADITIONAL_BACKGROUND: "Nontraditional education path",
    VariantSignal.NO_REFERRAL: "No employee referral",
    VariantSignal.ESL_COMMUNICATION: "ESL communication style in notes",
    VariantSignal.SCHOOL_PRESTIGE: "Different school prestige signal",
}


SIGNAL_DESCRIPTIONS: dict[VariantSignal, str] = {
    VariantSignal.BASELINE: "Standard presentation with no contextual modifiers.",
    VariantSignal.NONTRADITIONAL_BACKGROUND: "Bootcamp and self-taught credentials emphasized in header; traditional degree de-emphasized.",
    VariantSignal.NO_REFERRAL: "Application marked as cold apply with no internal referral.",
    VariantSignal.ESL_COMMUNICATION: "Recruiter notes reference non-native phrasing patterns; technical content unchanged.",
    VariantSignal.SCHOOL_PRESTIGE: "Institution listed as regional state university instead of target-tier school name.",
}


class CandidateVariant(BaseModel):
    id: str
    base_candidate_id: str
    signal: VariantSignal
    label: str
    changed_signal: str
    description: str
    context_overlay: dict = Field(default_factory=dict)
    # Frozen technical fields — identical across variants
    name: str
    target_role: str
    education: list = Field(default_factory=list)
    projects: list = Field(default_factory=list)
    experience: list = Field(default_factory=list)
    skills: list = Field(default_factory=list)
    technical_summary: str
    technical_equivalence_hash: str


class VariantsResponse(BaseModel):
    base_candidate_id: str
    variants: list[CandidateVariant]
