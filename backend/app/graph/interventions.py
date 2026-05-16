from __future__ import annotations

from app.schemas.simulation import InterventionFlags
from app.schemas.variant import CandidateVariant


def apply_context_filters(
    variant: CandidateVariant,
    interventions: InterventionFlags,
    agent: str,
) -> dict:
    """Return context overlay with intervention modifiers applied."""
    overlay = dict(variant.context_overlay)

    if interventions.blind_screening and agent in ("resume_screener", "recruiter"):
        overlay = {k: v for k, v in overlay.items() if k not in (
            "institution_signal",
            "prestige_modifier",
            "display_institution",
            "referral_status",
            "application_source",
            "education_emphasis",
            "credential_framing",
        )}
        overlay["blind_mode"] = True

    if interventions.hidden_recruiter_notes and agent == "technical_interviewer":
        overlay.pop("recruiter_phone_screen_notes", None)
        overlay.pop("communication_style_flag", None)

    if interventions.standardized_questions and agent == "technical_interviewer":
        overlay["interview_format"] = "standardized_rubric_only"
        overlay["probe_depth_locked"] = True

    if interventions.structured_rubric and agent in ("technical_interviewer", "hiring_manager"):
        overlay["evaluation_mode"] = "structured_rubric_only"

    return overlay


def intervention_prompt_suffix(interventions: InterventionFlags) -> str:
    parts: list[str] = []
    if interventions.blind_screening:
        parts.append("BLIND SCREENING: Ignore school prestige, referral status, and credential framing.")
    if interventions.structured_rubric:
        parts.append("STRUCTURED RUBRIC: Weight only documented technical evidence.")
    if interventions.hidden_recruiter_notes:
        parts.append("HIDDEN NOTES: Do not use recruiter soft-signal notes.")
    if interventions.standardized_questions:
        parts.append("STANDARDIZED QUESTIONS: Use identical probe depth for all variants.")
    return " ".join(parts)
