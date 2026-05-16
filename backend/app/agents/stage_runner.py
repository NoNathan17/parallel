"""Stream hiring-agent conversation turns and structured scores."""

from __future__ import annotations

import json
import logging
import re
import uuid
from collections.abc import AsyncIterator, Callable
from datetime import datetime, timezone
from typing import Any

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.config import get_stream_writer

from app.agents.prompts import SCORES_PROMPT, STAGE_PROMPTS
from app.llm import get_chat_model, is_llm_enabled
from app.schemas import CandidateVariant, SimulationState, TimelineEvent, TranscriptEntry

logger = logging.getLogger(__name__)

ScoreBundle = dict[str, float]
Scorer = Callable[[CandidateVariant], ScoreBundle]
FeedbackFn = Callable[..., str | list[str]]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _new_message_id() -> str:
    return str(uuid.uuid4())


def _emit(writer: Any, payload: dict[str, Any]) -> None:
    if writer is not None:
        writer(payload)


def _format_transcript(entries: list[TranscriptEntry]) -> str:
    if not entries:
        return "(no prior messages)"
    lines = []
    for e in entries[-12:]:
        lines.append(f"{e['speaker']}: {e['content']}")
    return "\n".join(lines)


def _build_handoff_text(
    *,
    source_agent: str,
    target_agent: str,
    candidate: CandidateVariant,
    target_role: str,
    stage_name: str,
) -> str:
    return (
        f"@{target_agent.replace(' Agent', '')} — handing off **{candidate['variant']}** "
        f"({candidate['name']}) for **{target_role}** at **{stage_name}**. "
        f"Equivalent qualifications; evaluation context: {candidate['signal']}"
    )


def _timeline_base(
    *,
    event_type: str,
    stage: str,
    stage_index: int,
    source_agent: str,
    target_agent: str,
    candidate: CandidateVariant | None = None,
) -> dict[str, Any]:
    evt: dict[str, Any] = {
        "type": event_type,
        "stage": stage,
        "stageIndex": stage_index,
        "sourceAgent": source_agent,
        "targetAgent": target_agent,
        "timestamp": _now(),
    }
    if candidate:
        evt["candidateId"] = candidate["id"]
        evt["candidateName"] = candidate["name"]
        evt["variant"] = candidate["variant"]
    return evt


def _parse_scores_json(raw: str) -> dict[str, Any] | None:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
    return None


def _scores_from_parsed(data: dict[str, Any], fallback: ScoreBundle) -> ScoreBundle:
    def _num(key: str, default: float, lo: float, hi: float) -> float:
        val = data.get(key, default)
        try:
            n = float(val)
        except (TypeError, ValueError):
            return default
        return max(lo, min(hi, n))

    tags = data.get("assumptionTags") or data.get("assumption_tags") or []
    if not isinstance(tags, list):
        tags = []

    return {
        "technicalScore": _num("technicalScore", fallback["technicalScore"], 0, 100),
        "subjectiveScore": _num("subjectiveScore", fallback["subjectiveScore"], 0, 100),
        "confidence": _num("confidence", fallback["confidence"], 0, 1),
        "callbackProbability": _num(
            "callbackProbability", fallback["callbackProbability"], 0, 1
        ),
        "_assumption_tags": [str(t) for t in tags],
        "_branch_reason": str(data.get("branchReason") or data.get("branch_reason") or ""),
    }


async def _stream_llm_text(messages: list[BaseMessage]) -> AsyncIterator[str]:
    model = get_chat_model(streaming=True)
    async for chunk in model.astream(messages):
        content = chunk.content
        if isinstance(content, str) and content:
            yield content
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, str):
                    yield block
                elif isinstance(block, dict) and block.get("type") == "text":
                    yield block.get("text", "")


async def _extract_scores(
    reasoning: str,
    *,
    stage_key: str,
    candidate: CandidateVariant,
    target_role: str,
    fallback: ScoreBundle,
) -> ScoreBundle:
    model = get_chat_model(streaming=False)
    system = SystemMessage(content=SCORES_PROMPT)
    human = HumanMessage(
        content=(
            f"Stage: {stage_key}\n"
            f"Role: {target_role}\n"
            f"Variant: {candidate['variant']} ({candidate['id']})\n"
            f"Signal: {candidate['signal']}\n\n"
            f"Your deliberation:\n{reasoning}"
        )
    )
    try:
        response = await model.ainvoke([system, human])
        raw = response.content if isinstance(response.content, str) else str(response.content)
        parsed = _parse_scores_json(raw)
        if parsed:
            bundle = _scores_from_parsed(parsed, fallback)
            return {
                "technicalScore": bundle["technicalScore"],
                "subjectiveScore": bundle["subjectiveScore"],
                "confidence": bundle["confidence"],
                "callbackProbability": bundle["callbackProbability"],
                "_assumption_tags": bundle.get("_assumption_tags", []),
                "_branch_reason": bundle.get("_branch_reason", ""),
            }
    except Exception:
        logger.exception("Score extraction failed for %s / %s", stage_key, candidate["id"])
    return {**fallback, "_assumption_tags": [], "_branch_reason": ""}


async def stream_agent_turn(
    *,
    state: SimulationState,
    candidate: CandidateVariant,
    stage_key: str,
    stage_name: str,
    stage_index: int,
    source_agent: str,
    target_agent: str,
    fallback_scorer: Scorer,
    fallback_feedback: FeedbackFn,
    prior_scores: dict[str, ScoreBundle] | None = None,
) -> tuple[ScoreBundle, list[TranscriptEntry], TimelineEvent]:
    """Run one agent turn: handoff → streamed reasoning → scores → evaluation event."""
    writer = get_stream_writer()
    target_role = state["target_role"]
    transcript = list(state.get("agent_transcript") or [])
    fallback = fallback_scorer(candidate)

    handoff_id = _new_message_id()
    handoff_text = _build_handoff_text(
        source_agent=source_agent,
        target_agent=target_agent,
        candidate=candidate,
        target_role=target_role,
        stage_name=stage_name,
    )

    _emit(
        writer,
        {
            **_timeline_base(
                event_type="agent_message_start",
                stage=stage_name,
                stage_index=stage_index,
                source_agent=source_agent,
                target_agent=target_agent,
                candidate=candidate,
            ),
            "messageId": handoff_id,
            "speaker": source_agent,
            "messageRole": "handoff",
            "content": "",
        },
    )
    _emit(
        writer,
        {
            "type": "agent_message_delta",
            "messageId": handoff_id,
            "delta": handoff_text,
            "stage": stage_name,
            "stageIndex": stage_index,
        },
    )
    _emit(
        writer,
        {
            "type": "agent_message_end",
            "messageId": handoff_id,
            "speaker": source_agent,
            "messageRole": "handoff",
            "content": handoff_text,
            "stage": stage_name,
            "stageIndex": stage_index,
            "candidateId": candidate["id"],
            "variant": candidate["variant"],
        },
    )

    new_transcript: list[TranscriptEntry] = [
        {
            "speaker": source_agent,
            "content": handoff_text,
            "stage": stage_name,
            "candidateId": candidate["id"],
        }
    ]

    reasoning_id = _new_message_id()
    reasoning = ""

    if is_llm_enabled():
        score_context = ""
        if prior_scores:
            lines = []
            for cid, s in prior_scores.items():
                lines.append(
                    f"  {cid}: technical={s.get('technicalScore')}, "
                    f"subjective={s.get('subjectiveScore')}, "
                    f"callback={s.get('callbackProbability')}"
                )
            score_context = "Prior stage scores:\n" + "\n".join(lines)

        system = SystemMessage(content=STAGE_PROMPTS[stage_key])
        human = HumanMessage(
            content=(
                f"Target role: {target_role}\n"
                f"Candidate variant: {candidate['variant']} (id={candidate['id']})\n"
                f"Inclusivity signal (context only): {candidate['signal']}\n\n"
                f"Resume snapshot:\n{candidate['resume_snapshot']}\n\n"
                f"Hiring thread so far:\n{_format_transcript(transcript)}\n\n"
                f"{score_context}\n\n"
                "Respond as the agent in this thread."
            )
        )

        _emit(
            writer,
            {
                **_timeline_base(
                    event_type="agent_message_start",
                    stage=stage_name,
                    stage_index=stage_index,
                    source_agent=source_agent,
                    target_agent=target_agent,
                    candidate=candidate,
                ),
                "messageId": reasoning_id,
                "speaker": target_agent,
                "messageRole": "reasoning",
                "content": "",
            },
        )

        async for delta in _stream_llm_text([system, human]):
            reasoning += delta
            _emit(
                writer,
                {
                    "type": "agent_message_delta",
                    "messageId": reasoning_id,
                    "delta": delta,
                    "stage": stage_name,
                    "stageIndex": stage_index,
                    "speaker": target_agent,
                    "candidateId": candidate["id"],
                    "variant": candidate["variant"],
                },
            )

        scores_raw = await _extract_scores(
            reasoning,
            stage_key=stage_key,
            candidate=candidate,
            target_role=target_role,
            fallback=fallback,
        )
        assumption_tags = scores_raw.pop("_assumption_tags", [])
        branch_reason = scores_raw.pop("_branch_reason", "")
        scores: ScoreBundle = scores_raw
    else:
        reasoning = fallback_feedback(candidate, fallback)  # type: ignore[call-arg]
        if not isinstance(reasoning, str):
            reasoning = str(reasoning)
        scores = fallback
        assumption_tags = fallback_feedback(candidate, fallback, tags_only=True)  # type: ignore
        branch_reason = fallback_feedback(candidate, fallback, branch_only=True)  # type: ignore
        if not isinstance(assumption_tags, list):
            assumption_tags = []
        if not isinstance(branch_reason, str):
            branch_reason = ""

        _emit(
            writer,
            {
                **_timeline_base(
                    event_type="agent_message_start",
                    stage=stage_name,
                    stage_index=stage_index,
                    source_agent=source_agent,
                    target_agent=target_agent,
                    candidate=candidate,
                ),
                "messageId": reasoning_id,
                "speaker": target_agent,
                "messageRole": "reasoning",
                "content": "",
            },
        )
        _emit(
            writer,
            {
                "type": "agent_message_delta",
                "messageId": reasoning_id,
                "delta": reasoning,
                "stage": stage_name,
                "stageIndex": stage_index,
                "speaker": target_agent,
            },
        )

    _emit(
        writer,
        {
            "type": "agent_message_end",
            "messageId": reasoning_id,
            "speaker": target_agent,
            "messageRole": "reasoning",
            "content": reasoning,
            "stage": stage_name,
            "stageIndex": stage_index,
            "candidateId": candidate["id"],
            "variant": candidate["variant"],
            "technicalScore": scores["technicalScore"],
            "subjectiveScore": scores["subjectiveScore"],
            "confidence": scores["confidence"],
            "callbackProbability": scores["callbackProbability"],
        },
    )

    new_transcript.append(
        {
            "speaker": target_agent,
            "content": reasoning,
            "stage": stage_name,
            "candidateId": candidate["id"],
        }
    )

    eval_event: TimelineEvent = {
        "type": "stage_evaluation",
        "stage": stage_name,
        "stageIndex": stage_index,
        "sourceAgent": source_agent,
        "targetAgent": target_agent,
        "message": f"{target_agent} evaluated {candidate['variant']}.",
        "stageFeedback": reasoning[:500] + ("…" if len(reasoning) > 500 else ""),
        "timestamp": _now(),
        "candidateId": candidate["id"],
        "candidateName": candidate["name"],
        "variant": candidate["variant"],
        "technicalScore": scores["technicalScore"],
        "subjectiveScore": scores["subjectiveScore"],
        "confidence": scores["confidence"],
        "callbackProbability": scores["callbackProbability"],
        "assumptionTags": assumption_tags,
    }
    if branch_reason:
        eval_event["branchReason"] = branch_reason

    return scores, new_transcript, eval_event


async def stream_auditor_summary(
    *,
    state: SimulationState,
    reasoning: str,
) -> None:
    """Stream the bias auditor's summary message."""
    writer = get_stream_writer()
    stage_name = "Bias Audit"
    message_id = _new_message_id()
    speaker = "Bias Auditor Agent"

    _emit(
        writer,
        {
            "type": "agent_message_start",
            "messageId": message_id,
            "speaker": speaker,
            "messageRole": "reasoning",
            "stage": stage_name,
            "stageIndex": 6,
            "sourceAgent": "Hiring Manager Agent",
            "targetAgent": speaker,
            "content": "",
        },
    )

    if is_llm_enabled() and not reasoning:
        system = SystemMessage(content=STAGE_PROMPTS["bias_auditor"])
        human = HumanMessage(
            content=(
                f"Target role: {state['target_role']}\n"
                f"Write your audit deliberation for the hiring team."
            )
        )
        async for delta in _stream_llm_text([system, human]):
            reasoning += delta
            _emit(
                writer,
                {
                    "type": "agent_message_delta",
                    "messageId": message_id,
                    "delta": delta,
                    "stage": stage_name,
                    "stageIndex": 6,
                    "speaker": speaker,
                },
            )
    else:
        _emit(
            writer,
            {
                "type": "agent_message_delta",
                "messageId": message_id,
                "delta": reasoning,
                "stage": stage_name,
                "stageIndex": 6,
                "speaker": speaker,
            },
        )

    _emit(
        writer,
        {
            "type": "agent_message_end",
            "messageId": message_id,
            "speaker": speaker,
            "messageRole": "reasoning",
            "content": reasoning,
            "stage": stage_name,
            "stageIndex": 6,
        },
    )
