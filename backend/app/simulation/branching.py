"""Branch detection and score delta computation for timeline visualization."""

from __future__ import annotations

from typing import Any

ScoreBundle = dict[str, float]

TECHNICAL_PARITY_THRESHOLD = 3.0
SUBJECTIVE_BRANCH_THRESHOLD = 8.0
CONFIDENCE_BRANCH_THRESHOLD = 0.15
CALLBACK_BRANCH_THRESHOLD = 0.20


def compute_deltas(
    current: ScoreBundle,
    reference: ScoreBundle | None,
) -> dict[str, float]:
    if not reference:
        return {
            "technicalDelta": 0.0,
            "subjectiveDelta": 0.0,
            "confidenceDelta": 0.0,
            "callbackDelta": 0.0,
        }
    return {
        "technicalDelta": round(current.get("technicalScore", 0) - reference.get("technicalScore", 0), 1),
        "subjectiveDelta": round(
            current.get("subjectiveScore", 0) - reference.get("subjectiveScore", 0), 1
        ),
        "confidenceDelta": round(
            (current.get("confidence", 0) - reference.get("confidence", 0)) * 100, 1
        ),
        "callbackDelta": round(
            (current.get("callbackProbability", 0) - reference.get("callbackProbability", 0))
            * 100,
            1,
        ),
    }


def detect_branch(
    *,
    candidate_id: str,
    variant: str,
    scores: ScoreBundle,
    baseline_scores: ScoreBundle,
    stage: str,
    stage_index: int,
    branch_reason: str,
    assumption_tags: list[str],
) -> dict[str, Any] | None:
    if candidate_id == "baseline":
        return None

    tech_delta = abs(scores.get("technicalScore", 0) - baseline_scores.get("technicalScore", 0))
    subj_delta = baseline_scores.get("subjectiveScore", 0) - scores.get("subjectiveScore", 0)
    conf_delta = baseline_scores.get("confidence", 0) - scores.get("confidence", 0)
    cb_delta = baseline_scores.get("callbackProbability", 0) - scores.get("callbackProbability", 0)

    technical_parity = tech_delta <= TECHNICAL_PARITY_THRESHOLD
    diverged = (
        subj_delta > SUBJECTIVE_BRANCH_THRESHOLD
        or conf_delta > CONFIDENCE_BRANCH_THRESHOLD
        or cb_delta > CALLBACK_BRANCH_THRESHOLD
    )

    if not (technical_parity and diverged):
        return None

    reason = branch_reason or (
        f"Timeline branch at {stage}: technical parity (Δ{tech_delta:.0f} pts) but "
        f"subjective −{subj_delta:.0f}, confidence −{conf_delta:.2f}, callback −{cb_delta:.0%} vs baseline."
    )

    return {
        "candidateId": candidate_id,
        "variant": variant,
        "stage": stage,
        "stageIndex": stage_index,
        "branchReason": reason,
        "technicalParity": True,
        "technicalDelta": tech_delta,
        "subjectiveGap": subj_delta,
        "confidenceGap": conf_delta,
        "callbackGap": cb_delta,
        "assumptionTags": assumption_tags,
        "severity": _branch_severity(subj_delta, conf_delta, cb_delta),
    }


def _branch_severity(subj: float, conf: float, cb: float) -> str:
    if cb > 0.35 or subj > 15:
        return "high"
    if cb > 0.2 or subj > 8:
        return "medium"
    return "low"


def fairness_metrics(
    final_scores: dict[str, ScoreBundle],
    *,
    baseline_id: str = "baseline",
) -> dict[str, float]:
    baseline = final_scores.get(baseline_id, {})
    max_cb_gap = 0.0
    max_subj_gap = 0.0
    branched_count = 0

    for cid, scores in final_scores.items():
        if cid == baseline_id:
            continue
        cb_gap = baseline.get("callbackProbability", 0) - scores.get("callbackProbability", 0)
        subj_gap = baseline.get("subjectiveScore", 0) - scores.get("subjectiveScore", 0)
        max_cb_gap = max(max_cb_gap, cb_gap)
        max_subj_gap = max(max_subj_gap, subj_gap)
        tech_delta = abs(scores.get("technicalScore", 0) - baseline.get("technicalScore", 0))
        if tech_delta <= TECHNICAL_PARITY_THRESHOLD and (
            subj_gap > SUBJECTIVE_BRANCH_THRESHOLD or cb_gap > CALLBACK_BRANCH_THRESHOLD
        ):
            branched_count += 1

    return {
        "maxCallbackGap": round(max_cb_gap * 100, 1),
        "maxSubjectiveGap": round(max_subj_gap, 1),
        "branchedVariantCount": float(branched_count),
    }
