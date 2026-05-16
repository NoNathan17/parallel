from datetime import datetime, timezone

from app.agents.stage_runner import stream_agent_turn, stream_auditor_summary
from app.candidate_generator import create_candidate_variants
from app.llm import enhance_audit_feedback, is_llm_enabled
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
            )
        )
    return {"candidates": candidates, "current_stage_index": 1, "events": events}


def _screener_feedback(candidate: CandidateVariant, scores: dict, tags_only=False, branch_only=False):
    tags = ["skills_match", "role_alignment"]
    branch = ""
    if candidate["id"] == "race":
        tags.extend(["identity_signal", "name_bias"])
        branch = "Slight subjective discount at screen; technical parity maintained."
    text = (
        f"Resume screener: technical {scores['technicalScore']:.0f}, "
        f"subjective {scores['subjectiveScore']:.0f}. Core qualifications align with role."
    )
    if branch_only:
        return branch
    if tags_only:
        return tags
    return text + (f" {branch}" if branch else "")


def _recruiter_feedback(candidate: CandidateVariant, scores: dict, tags_only=False, branch_only=False):
    tags = ["culture_fit", "polish"]
    branch = ""
    vid = candidate["id"]
    if vid == "gender":
        tags.extend(["gender_bias", "fit_heuristic"])
        branch = "Recruiter flags 'fit' concerns not grounded in skills gap."
    elif vid == "race":
        tags.extend(["racial_bias", "pedigree_proxy"])
        branch = "Subjective 'polish' discount; comparable technical screen."
    elif vid == "socioeconomic":
        tags.extend(["class_bias", "network_signal"])
        branch = "Pedigree and network assumptions reduce callback despite parity."
    text = (
        f"Recruiter review: subjective {scores['subjectiveScore']:.0f}, "
        f"callback {scores['callbackProbability']:.0%}."
    )
    if branch_only:
        return branch
    if tags_only:
        return tags
    return text + (f" {branch}" if branch else "")


def _technical_feedback(candidate: CandidateVariant, scores: dict, tags_only=False, branch_only=False):
    tags = ["technical_depth", "problem_solving"]
    branch = ""
    if candidate["id"] == "gender":
        tags.extend(["communication_style", "assertiveness_bias"])
        branch = (
            "Technical answers solid; subjective 'communication' scored lower — "
            "possible gendered expectation bias."
        )
    text = (
        f"Technical interview: technical {scores['technicalScore']:.0f}, "
        f"subjective {scores['subjectiveScore']:.0f}."
    )
    if branch_only:
        return branch
    if tags_only:
        return tags
    return text + (f" {branch}" if branch else "")


def _manager_feedback(candidate: CandidateVariant, scores: dict, tags_only=False, branch_only=False):
    tags = ["aggregate_review", "prior_stage_notes"]
    branch = "Final decision weighs subjective and confidence over technical parity."
    text = (
        f"Hiring manager: callback {scores['callbackProbability']:.0%}, "
        f"confidence {scores['confidence']:.0%}."
    )
    if branch_only:
        return branch
    if tags_only:
        return tags
    return text


async def _run_stage_for_all(
    state: SimulationState,
    *,
    stage_key: str,
    stage_index: int,
    stage_name: str,
    source_agent: str,
    target_agent: str,
    scorer,
    feedback_fn,
) -> dict:
    candidates = state["candidates"]
    stage_scores: dict[str, dict[str, float]] = dict(state.get("stage_scores") or {})
    transcript = list(state.get("agent_transcript") or [])
    events: list[TimelineEvent] = []
    prior_scores = dict(stage_scores)

    for candidate in candidates:
        merged_state: SimulationState = {**state, "agent_transcript": transcript}
        scores, new_lines, eval_event = await stream_agent_turn(
            state=merged_state,
            candidate=candidate,
            stage_key=stage_key,
            stage_name=stage_name,
            stage_index=stage_index,
            source_agent=source_agent,
            target_agent=target_agent,
            fallback_scorer=scorer,
            fallback_feedback=feedback_fn,
            prior_scores=prior_scores or None,
        )
        stage_scores[candidate["id"]] = scores
        transcript.extend(new_lines)
        events.append(eval_event)

    return {
        "current_stage_index": stage_index,
        "stage_scores": stage_scores,
        "agent_transcript": transcript,
        "events": events,
    }


async def resume_screener_node(state: SimulationState) -> dict:
    return await _run_stage_for_all(
        state,
        stage_key="resume_screener",
        stage_index=2,
        stage_name=STAGE_NAMES[2],
        source_agent="Variant Generator",
        target_agent="Resume Screener Agent",
        scorer=score_resume_screener,
        feedback_fn=_screener_feedback,
    )


async def recruiter_node(state: SimulationState) -> dict:
    return await _run_stage_for_all(
        state,
        stage_key="recruiter",
        stage_index=3,
        stage_name=STAGE_NAMES[3],
        source_agent="Resume Screener Agent",
        target_agent="Recruiter Agent",
        scorer=score_recruiter,
        feedback_fn=_recruiter_feedback,
    )


async def technical_interviewer_node(state: SimulationState) -> dict:
    return await _run_stage_for_all(
        state,
        stage_key="technical_interviewer",
        stage_index=4,
        stage_name=STAGE_NAMES[4],
        source_agent="Recruiter Agent",
        target_agent="Technical Interviewer Agent",
        scorer=score_technical_interviewer,
        feedback_fn=_technical_feedback,
    )


async def hiring_manager_node(state: SimulationState) -> dict:
    prior_scores = state.get("stage_scores") or {}
    candidates = state["candidates"]
    stage_scores: dict[str, dict[str, float]] = dict(prior_scores)
    transcript = list(state.get("agent_transcript") or [])
    events: list[TimelineEvent] = []

    for candidate in candidates:
        prev = prior_scores.get(candidate["id"], score_technical_interviewer(candidate))
        merged_state: SimulationState = {**state, "agent_transcript": transcript}

        def hm_scorer(c: CandidateVariant, _prev: dict[str, float] = prev) -> dict[str, float]:
            return score_hiring_manager(c, _prev)

        scores, new_lines, eval_event = await stream_agent_turn(
            state=merged_state,
            candidate=candidate,
            stage_key="hiring_manager",
            stage_name=STAGE_NAMES[5],
            stage_index=5,
            source_agent="Technical Interviewer Agent",
            target_agent="Hiring Manager Agent",
            fallback_scorer=hm_scorer,
            fallback_feedback=_manager_feedback,
            prior_scores=prior_scores,
        )
        stage_scores[candidate["id"]] = scores
        transcript.extend(new_lines)
        events.append(eval_event)

    return {
        "current_stage_index": 5,
        "stage_scores": stage_scores,
        "agent_transcript": transcript,
        "events": events,
    }


async def bias_auditor_node(state: SimulationState) -> dict:
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
            )
        )

    interventions = [
        "Blind resume review and structured rubrics before recruiter screen to reduce identity signaling.",
        "Separate technical scoring from subjective 'culture fit' with calibrated definitions.",
        "Diverse interview panels and bias interrupts when callback rates diverge by demographic variant.",
        "Audit subjective language in feedback for gendered, racial, or class-coded assumptions.",
    ]

    fallback_feedback: FinalFeedback = {
        "summary": (
            "Parallel simulation complete. Four equivalent-qualification variants across gender, "
            "race/ethnicity, and socioeconomic dimensions diverged on subjective scores and callback "
            "probability while technical scores stayed comparable — indicating inclusivity gaps, "
            "not skills gaps."
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

    await stream_auditor_summary(
        state=state,
        reasoning="" if is_llm_enabled() else fallback_feedback["summary"],
    )

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
