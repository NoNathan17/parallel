"""Intervention definitions and score adjustments for replay simulations."""

from __future__ import annotations

import copy
from typing import Any, Callable

from app.schemas import CandidateVariant

ScoreBundle = dict[str, float]
Scorer = Callable[[CandidateVariant], ScoreBundle]

INTERVENTION_LABELS: dict[str, str] = {
    "blind_screening": "Blind resume screening (identity signals masked before recruiter)",
    "structured_rubric": "Structured rubric (subjective scores calibrated to skills evidence)",
    "diverse_panel": "Diverse interview panel (confidence boost when subjective gap detected)",
}

VALID_INTERVENTIONS = frozenset(INTERVENTION_LABELS.keys())


def normalize_interventions(raw: list[str] | None) -> list[str]:
    if not raw:
        return []
    return [i for i in raw if i in VALID_INTERVENTIONS]


def wrap_scorer(base: Scorer, interventions: list[str], stage_key: str) -> Scorer:
    if not interventions:
        return base

    def adjusted(candidate: CandidateVariant) -> ScoreBundle:
        scores = copy.deepcopy(base(candidate))
        return apply_interventions_to_scores(
            scores, candidate=candidate, interventions=interventions, stage_key=stage_key
        )

    return adjusted


def apply_interventions_to_scores(
    scores: ScoreBundle,
    *,
    candidate: CandidateVariant,
    interventions: list[str],
    stage_key: str,
) -> ScoreBundle:
    if candidate["id"] == "baseline":
        return scores

    result = copy.deepcopy(scores)

    if "blind_screening" in interventions and stage_key in ("resume_screener", "recruiter"):
        result["subjectiveScore"] = min(100, result["subjectiveScore"] + 10)
        result["confidence"] = min(1.0, result["confidence"] + 0.12)
        result["callbackProbability"] = min(1.0, result["callbackProbability"] + 0.15)

    if "structured_rubric" in interventions and stage_key in (
        "resume_screener",
        "recruiter",
        "technical_interviewer",
    ):
        result["subjectiveScore"] = min(100, result["subjectiveScore"] + 6)
        gap = max(0, result["technicalScore"] - result["subjectiveScore"])
        if gap > 10:
            result["subjectiveScore"] = result["technicalScore"] - 8

    if "diverse_panel" in interventions and stage_key in (
        "technical_interviewer",
        "hiring_manager",
    ):
        result["confidence"] = min(1.0, result["confidence"] + 0.08)
        result["callbackProbability"] = min(1.0, result["callbackProbability"] + 0.1)

    return result


def intervention_impact_summary(
    metrics_without: dict[str, float],
    metrics_with: dict[str, float],
) -> dict[str, Any]:
    return {
        "type": "intervention_result",
        "message": "Intervention replay reduced measured divergence.",
        "before": metrics_without,
        "after": metrics_with,
        "callbackGapReduction": round(
            metrics_without.get("maxCallbackGap", 0) - metrics_with.get("maxCallbackGap", 0),
            1,
        ),
        "subjectiveGapReduction": round(
            metrics_without.get("maxSubjectiveGap", 0) - metrics_with.get("maxSubjectiveGap", 0),
            1,
        ),
    }
