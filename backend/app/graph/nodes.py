from datetime import datetime, timezone

from app.candidate_generator import create_candidate_variants
from app.llm import enhance_audit_feedback
from app.resume_parser import parse_resume_text
from app.schemas import CandidateVariant, FinalFeedback, SimulationState, TimelineEvent
from app.scoring import (
    STAGE_NAMES,
    score_hiring_manager,
    score_recruiter,
    score_resume_screener,
    score_technical_interviewer,
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _event(
    *,
    event_type: str,
    stage: str,
    stage_index: int,
    source_agent: str,
    target_agent: str,
    message: str,
    stage_feedback: str,
    candidate: CandidateVariant | None = None,
    scores: dict[str, float] | None = None,
    assumption_tags: list[str] | None = None,
    branch_reason: str = "",
) -> TimelineEvent:
    evt: TimelineEvent = {
        "type": event_type,
        "stage": stage,
        "stageIndex": stage_index,
        "sourceAgent": source_agent,
        "targetAgent": target_agent,
        "message": message,
        "stageFeedback": stage_feedback,
        "timestamp": _now(),
    }
    if candidate:
        evt["candidateId"] = candidate["id"]
        evt["candidateName"] = candidate["name"]
        evt["variant"] = candidate["variant"]
    if scores:
        evt["technicalScore"] = scores["technicalScore"]
        evt["subjectiveScore"] = scores["subjectiveScore"]
        evt["confidence"] = scores["confidence"]
        evt["callbackProbability"] = scores["callbackProbability"]
    if assumption_tags:
        evt["assumptionTags"] = assumption_tags
    if branch_reason:
        evt["branchReason"] = branch_reason
    return evt


def parse_resume_node(state: SimulationState) -> dict:
    parsed = parse_resume_text(state["raw_resume_text"])
    skills_preview = ", ".join(parsed["skills"][:4]) if parsed["skills"] else "relevant stack"
    event = _event(
        event_type="stage_update",
        stage=STAGE_NAMES[0],
        stage_index=0,
        source_agent="System",
        target_agent="Resume Parser",
        message="Resume parsed into structured candidate profile.",
        stage_feedback=(
            f"Parsed candidate profile with {skills_preview} and "
            f"{len(parsed['projects'])} project(s), {len(parsed['experience'])} experience line(s)."
        ),
    )
    return {
        "parsed_resume": parsed,
        "current_stage_index": 0,
        "events": [event],
    }


def generate_candidate_variants_node(state: SimulationState) -> dict:
    candidates = create_candidate_variants(state["parsed_resume"], state["target_role"])
    events: list[TimelineEvent] = []
    for c in candidates:
        events.append(
            _event(
                event_type="variant_created",
                stage=STAGE_NAMES[1],
                stage_index=1,
                source_agent="Variant Generator",
                target_agent="Simulation Engine",
                message=f"Created variant: {c['variant']}",
                stage_feedback=(
                    f"Variant '{c['variant']}' preserves equivalent qualifications; "
                    f"contextual signal only: {c['signal']}"
                ),
                candidate=c,
                assumption_tags=["controlled_variant", "equivalent_qualifications"],
            )
        )
    return {"candidates": candidates, "current_stage_index": 1, "events": events}


def _evaluate_stage(
    state: SimulationState,
    *,
    stage_index: int,
    stage_name: str,
    source_agent: str,
    target_agent: str,
    scorer,
    feedback_fn,
) -> dict:
    candidates = state["candidates"]
    stage_scores: dict[str, dict[str, float]] = dict(state.get("stage_scores") or {})
    events: list[TimelineEvent] = []
    for candidate in candidates:
        scores = scorer(candidate)
        stage_scores[candidate["id"]] = scores
        events.append(
            _event(
                event_type="stage_evaluation",
                stage=stage_name,
                stage_index=stage_index,
                source_agent=source_agent,
                target_agent=target_agent,
                message=f"{target_agent} evaluated {candidate['variant']}.",
                stage_feedback=feedback_fn(candidate, scores),
                candidate=candidate,
                scores=scores,
                assumption_tags=feedback_fn(candidate, scores, tags_only=True),  # type: ignore[arg-type]
                branch_reason=feedback_fn(candidate, scores, branch_only=True),  # type: ignore[arg-type]
            )
        )
    return {
        "current_stage_index": stage_index,
        "stage_scores": stage_scores,
        "events": events,
    }


def _screener_feedback(candidate: CandidateVariant, scores: dict, tags_only=False, branch_only=False):
    tags = ["skills_match", "role_alignment"]
    branch = ""
    if candidate["id"] == "nontraditional":
        tags.append("nontraditional_path")
        branch = "Slight subjective discount; technical parity maintained."
    text = (
        f"Resume screener: technical {scores['technicalScore']:.0f}, "
        f"subjective {scores['subjectiveScore']:.0f}. Core qualifications align with role."
    )
    if branch_only:
        return branch
    if tags_only:
        return tags
    return text + (f" {branch}" if branch else "")


def resume_screener_node(state: SimulationState) -> dict:
    return _evaluate_stage(
        state,
        stage_index=2,
        stage_name=STAGE_NAMES[2],
        source_agent="Variant Generator",
        target_agent="Resume Screener Agent",
        scorer=score_resume_screener,
        feedback_fn=_screener_feedback,
    )


def _recruiter_feedback(candidate: CandidateVariant, scores: dict, tags_only=False, branch_only=False):
    tags = ["culture_fit", "polish", "referral_signal"]
    branch = ""
    vid = candidate["id"]
    if vid == "nontraditional":
        tags.extend(["pedigree_bias", "fit_heuristic"])
        branch = "Recruiter notes 'unusual path' despite strong technical screen."
    elif vid == "no_referral":
        tags.extend(["referral_absence", "pipeline_cold"])
        branch = "No referral signal; perceived risk elevated without skills gap."
    text = (
        f"Recruiter review (Resume Screener Agent → Recruiter Agent): "
        f"subjective {scores['subjectiveScore']:.0f}, callback {scores['callbackProbability']:.0%}."
    )
    if branch_only:
        return branch
    if tags_only:
        return tags
    return text + (f" {branch}" if branch else "")


def recruiter_node(state: SimulationState) -> dict:
    return _evaluate_stage(
        state,
        stage_index=3,
        stage_name=STAGE_NAMES[3],
        source_agent="Resume Screener Agent",
        target_agent="Recruiter Agent",
        scorer=score_recruiter,
        feedback_fn=_recruiter_feedback,
    )


def _technical_feedback(candidate: CandidateVariant, scores: dict, tags_only=False, branch_only=False):
    tags = ["technical_depth", "problem_solving"]
    branch = ""
    if candidate["id"] == "esl":
        tags.extend(["communication_style", "fluency_bias"])
        branch = (
            "Technical answers correct; explanation clarity scored lower due to "
            "communication style assumptions."
        )
    text = (
        f"Technical interview (Recruiter Agent → Technical Interviewer Agent): "
        f"technical {scores['technicalScore']:.0f}, subjective {scores['subjectiveScore']:.0f}."
    )
    if branch_only:
        return branch
    if tags_only:
        return tags
    return text + (f" {branch}" if branch else "")


def technical_interviewer_node(state: SimulationState) -> dict:
    return _evaluate_stage(
        state,
        stage_index=4,
        stage_name=STAGE_NAMES[4],
        source_agent="Recruiter Agent",
        target_agent="Technical Interviewer Agent",
        scorer=score_technical_interviewer,
        feedback_fn=_technical_feedback,
    )


def _manager_feedback(candidate: CandidateVariant, scores: dict, tags_only=False, branch_only=False):
    tags = ["aggregate_review", "prior_stage_notes"]
    branch = "Final decision weighs subjective and confidence over technical parity."
    text = (
        f"Hiring manager (Technical Interviewer Agent → Hiring Manager Agent): "
        f"callback {scores['callbackProbability']:.0%}, confidence {scores['confidence']:.0%}."
    )
    if branch_only:
        return branch
    if tags_only:
        return tags
    return text


def hiring_manager_node(state: SimulationState) -> dict:
    prior_scores = state.get("stage_scores") or {}
    candidates = state["candidates"]
    stage_scores: dict[str, dict[str, float]] = dict(prior_scores)
    events: list[TimelineEvent] = []
    for candidate in candidates:
        prev = prior_scores.get(candidate["id"], score_technical_interviewer(candidate))
        scores = score_hiring_manager(candidate, prev)
        stage_scores[candidate["id"]] = scores
        events.append(
            _event(
                event_type="stage_evaluation",
                stage=STAGE_NAMES[5],
                stage_index=5,
                source_agent="Technical Interviewer Agent",
                target_agent="Hiring Manager Agent",
                message=f"Hiring Manager decision for {candidate['variant']}.",
                stage_feedback=_manager_feedback(candidate, scores),
                candidate=candidate,
                scores=scores,
                assumption_tags=_manager_feedback(candidate, scores, tags_only=True),  # type: ignore
                branch_reason=_manager_feedback(candidate, scores, branch_only=True),  # type: ignore
            )
        )
    return {"current_stage_index": 5, "stage_scores": stage_scores, "events": events}


def bias_auditor_node(state: SimulationState) -> dict:
    candidates = state["candidates"]
    final_scores = state.get("stage_scores") or {}
    baseline = final_scores.get("baseline", {})
    events: list[TimelineEvent] = []
    divergence_points: list[str] = []
    key_findings: list[str] = []

    for candidate in candidates:
        if candidate["id"] == "baseline":
            continue
        scores = final_scores.get(candidate["id"], {})
        tech_delta = abs(scores.get("technicalScore", 0) - baseline.get("technicalScore", 0))
        subj_delta = baseline.get("subjectiveScore", 0) - scores.get("subjectiveScore", 0)
        conf_delta = baseline.get("confidence", 0) - scores.get("confidence", 0)
        cb_delta = baseline.get("callbackProbability", 0) - scores.get("callbackProbability", 0)

        if tech_delta <= 3 and (subj_delta > 8 or conf_delta > 0.15 or cb_delta > 0.2):
            point = (
                f"{candidate['variant']}: technical scores within {tech_delta:.0f} pts of baseline, "
                f"but subjective −{subj_delta:.0f}, confidence −{conf_delta:.2f}, "
                f"callback −{cb_delta:.0%}."
            )
            divergence_points.append(point)
            key_findings.append(
                f"Comparable technical strength; outcome divergence driven by contextual signals "
                f"({candidate['signal']})."
            )

        events.append(
            _event(
                event_type="audit_review",
                stage=STAGE_NAMES[6],
                stage_index=6,
                source_agent="Hiring Manager Agent",
                target_agent="Bias Auditor Agent",
                message=f"Bias audit completed for {candidate['variant']}.",
                stage_feedback=(
                    f"Auditor compared trajectory vs baseline. "
                    f"Technical parity: {scores.get('technicalScore', 0):.0f} vs "
                    f"{baseline.get('technicalScore', 0):.0f}."
                ),
                candidate=candidate,
                scores=scores,
                assumption_tags=["fairness_audit", "trajectory_comparison"],
            )
        )

    interventions = [
        "Blind resume screening before recruiter review to reduce pedigree signaling.",
        "Structured rubrics for subjective dimensions; separate communication from technical scoring.",
        "Referral-agnostic pipeline stages until hiring manager review.",
        "Calibration sessions when technical scores align but callback probability diverges >15%.",
    ]

    fallback_feedback: FinalFeedback = {
        "summary": (
            "Parallel simulation complete. Four equivalent-qualification variants "
            "diverged primarily on subjective scores and callback probability while technical "
            "scores remained comparable—indicating contextual bias rather than skills gaps."
        ),
        "key_findings": key_findings
        or [
            "All variants presented equivalent core skills and project experience.",
            "Baseline advanced with highest subjective and callback scores.",
        ],
        "divergence_points": divergence_points
        or ["No major divergence detected in mock run (unexpected)."],
        "suggested_interventions": interventions,
        "fairness_delta_placeholder": "Fairness delta metric placeholder — integrate calibrated scoring in production.",
    }

    final_feedback = enhance_audit_feedback(
        target_role=state["target_role"],
        candidates=candidates,
        final_scores=final_scores,
        divergence_points=divergence_points,
        key_findings=key_findings,
        fallback=fallback_feedback,
    )

    events.append(
        _event(
            event_type="audit_summary",
            stage=STAGE_NAMES[6],
            stage_index=6,
            source_agent="Bias Auditor Agent",
            target_agent="Simulation Engine",
            message="Bias audit summary generated.",
            stage_feedback=final_feedback["summary"],
        )
    )

    return {
        "current_stage_index": 6,
        "final_feedback": final_feedback,
        "events": events,
    }
