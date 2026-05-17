"""Central SSE event builder with sequence numbers for real-time timeline UI."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from langgraph.config import get_stream_writer

from app.schemas import CandidateVariant
from app.simulation.assumptions import propagate_assumptions
from app.simulation.branching import compute_deltas, detect_branch
from app.simulation.context import get_emitter


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class SimulationEmitter:
    """Builds interpretable timeline events and publishes via LangGraph custom stream."""

    def __init__(
        self,
        *,
        simulation_id: str,
        interventions: list[str] | None = None,
        is_replay: bool = False,
    ) -> None:
        self.simulation_id = simulation_id
        self.interventions = interventions or []
        self.is_replay = is_replay
        self.seq = 0
        self.timeline_step = 0
        self.baseline_scores_by_stage: dict[int, ScoreBundle] = {}
        self.prior_scores: dict[str, ScoreBundle] = {}
        self.candidate_assumptions: dict[str, set[str]] = {}
        self.branched_candidates: set[str] = set()

    def _next_seq(self) -> int:
        self.seq += 1
        return self.seq

    def _next_step(self) -> int:
        self.timeline_step += 1
        return self.timeline_step

    def _envelope(self, event: dict[str, Any]) -> dict[str, Any]:
        event.setdefault("timestamp", _now())
        event["seq"] = self._next_seq()
        event["simulationId"] = self.simulation_id
        event["timelineStep"] = self._next_step()
        return event

    def publish(self, event: dict[str, Any]) -> dict[str, Any]:
        payload = self._envelope(event)
        try:
            writer = get_stream_writer()
            writer(payload)
        except Exception:
            pass
        return payload

    def tick(self, phase: str, **extra: Any) -> dict[str, Any]:
        return self.publish({"type": "tick", "phase": phase, **extra})

    def simulation_started(
        self,
        *,
        target_role: str,
        candidate_ids: list[str],
        stages: list[str],
    ) -> dict[str, Any]:
        return self.publish(
            {
                "type": "simulation_started",
                "targetRole": target_role,
                "candidateIds": candidate_ids,
                "stages": stages,
                "interventions": self.interventions,
                "isReplay": self.is_replay,
            }
        )

    def intervention_applied(self, intervention_id: str, label: str) -> dict[str, Any]:
        return self.publish(
            {
                "type": "intervention_applied",
                "interventionId": intervention_id,
                "message": label,
                "sourceAgent": "Intervention Agent",
                "targetAgent": "Simulation Engine",
            }
        )

    def stage_entered(
        self,
        *,
        stage: str,
        stage_index: int,
        candidate_ids: list[str],
        source_agent: str = "Simulation Engine",
    ) -> dict[str, Any]:
        self.tick("stage_entered", stage=stage, stageIndex=stage_index)
        return self.publish(
            {
                "type": "stage_entered",
                "stage": stage,
                "stageIndex": stage_index,
                "candidateIds": candidate_ids,
                "sourceAgent": source_agent,
                "message": f"All variants entering {stage}.",
            }
        )

    def candidate_created(self, candidate: CandidateVariant, stage_index: int = 1) -> dict[str, Any]:
        self.candidate_assumptions[candidate["id"]] = set()
        return self.publish(
            {
                "type": "candidate_created",
                "stage": "Variant Generation",
                "stageIndex": stage_index,
                "candidateId": candidate["id"],
                "candidateName": candidate["name"],
                "variant": candidate["variant"],
                "signal": candidate["signal"],
                "sourceAgent": "Candidate Variant Agent",
                "targetAgent": "Simulation Engine",
                "message": f"Variant ready: {candidate['variant']}",
                "resumeSnapshot": candidate["resume_snapshot"],
            }
        )

    def candidate_stage_started(
        self,
        *,
        candidate: CandidateVariant,
        stage: str,
        stage_index: int,
        target_agent: str,
    ) -> dict[str, Any]:
        return self.publish(
            {
                "type": "candidate_stage_started",
                "stage": stage,
                "stageIndex": stage_index,
                "candidateId": candidate["id"],
                "variant": candidate["variant"],
                "targetAgent": target_agent,
                "message": f"{candidate['variant']} entering {stage}.",
            }
        )

    def agent_message(
        self,
        *,
        candidate: CandidateVariant,
        stage: str,
        stage_index: int,
        source_agent: str,
        target_agent: str,
        message: str,
        message_role: str = "reasoning",
        scores: dict[str, float] | None = None,
        prior_reference: dict[str, float] | None = None,
        baseline_reference: dict[str, float] | None = None,
        assumption_tags: list[str] | None = None,
        branch_reason: str = "",
        message_id: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "type": "agent_message",
            "stage": stage,
            "stageIndex": stage_index,
            "candidateId": candidate["id"],
            "candidateName": candidate["name"],
            "variant": candidate["variant"],
            "sourceAgent": source_agent,
            "targetAgent": target_agent,
            "message": message,
            "messageRole": message_role,
            "messageId": message_id or str(uuid.uuid4()),
        }
        if assumption_tags:
            payload["assumptionTags"] = assumption_tags
        if branch_reason:
            payload["branchReason"] = branch_reason
        if scores:
            payload.update(scores)
            deltas_vs_prior = compute_deltas(scores, prior_reference)
            payload.update(deltas_vs_prior)
            if baseline_reference and candidate["id"] != "baseline":
                deltas_vs_baseline = compute_deltas(scores, baseline_reference)
                payload["confidenceDeltaVsBaseline"] = deltas_vs_baseline["confidenceDelta"]
                payload["callbackDeltaVsBaseline"] = deltas_vs_baseline["callbackDelta"]
                payload["subjectiveDeltaVsBaseline"] = deltas_vs_baseline["subjectiveDelta"]
        return self.publish(payload)

    def stream_message_start(
        self,
        *,
        message_id: str,
        speaker: str,
        message_role: str,
        stage: str,
        stage_index: int,
        source_agent: str,
        target_agent: str,
        candidate: CandidateVariant | None = None,
    ) -> None:
        evt: dict[str, Any] = {
            "type": "agent_message_start",
            "messageId": message_id,
            "speaker": speaker,
            "messageRole": message_role,
            "stage": stage,
            "stageIndex": stage_index,
            "sourceAgent": source_agent,
            "targetAgent": target_agent,
            "content": "",
        }
        if candidate:
            evt["candidateId"] = candidate["id"]
            evt["variant"] = candidate["variant"]
        self.publish(evt)

    def stream_message_delta(
        self,
        *,
        message_id: str,
        delta: str,
        stage: str,
        stage_index: int,
        speaker: str,
        candidate: CandidateVariant | None = None,
    ) -> None:
        evt: dict[str, Any] = {
            "type": "agent_message_delta",
            "messageId": message_id,
            "delta": delta,
            "stage": stage,
            "stageIndex": stage_index,
            "speaker": speaker,
        }
        if candidate:
            evt["candidateId"] = candidate["id"]
            evt["variant"] = candidate["variant"]
        self.publish(evt)

    def stream_message_end(
        self,
        *,
        message_id: str,
        speaker: str,
        message_role: str,
        content: str,
        stage: str,
        stage_index: int,
        candidate: CandidateVariant | None = None,
        scores: dict[str, float] | None = None,
    ) -> None:
        evt: dict[str, Any] = {
            "type": "agent_message_end",
            "messageId": message_id,
            "speaker": speaker,
            "messageRole": message_role,
            "content": content,
            "stage": stage,
            "stageIndex": stage_index,
        }
        if candidate:
            evt["candidateId"] = candidate["id"]
            evt["variant"] = candidate["variant"]
        if scores:
            evt.update(
                {
                    "technicalScore": scores.get("technicalScore"),
                    "subjectiveScore": scores.get("subjectiveScore"),
                    "confidence": scores.get("confidence"),
                    "callbackProbability": scores.get("callbackProbability"),
                }
            )
        self.publish(evt)

    def score_update(
        self,
        *,
        candidate: CandidateVariant,
        stage: str,
        stage_index: int,
        source_agent: str,
        scores: dict[str, float],
        prior_reference: dict[str, float] | None,
        baseline_reference: dict[str, float] | None,
    ) -> dict[str, Any]:
        deltas = compute_deltas(scores, prior_reference)
        payload: dict[str, Any] = {
            "type": "score_update",
            "stage": stage,
            "stageIndex": stage_index,
            "candidateId": candidate["id"],
            "variant": candidate["variant"],
            "sourceAgent": source_agent,
            "technicalScore": scores["technicalScore"],
            "subjectiveScore": scores["subjectiveScore"],
            "confidence": scores["confidence"],
            "callbackProbability": scores["callbackProbability"],
            **deltas,
        }
        if baseline_reference and candidate["id"] != "baseline":
            baseline_deltas = compute_deltas(scores, baseline_reference)
            payload["confidenceDeltaVsBaseline"] = baseline_deltas["confidenceDelta"]
            payload["callbackDeltaVsBaseline"] = baseline_deltas["callbackDelta"]
            payload["subjectiveDeltaVsBaseline"] = baseline_deltas["subjectiveDelta"]
        return self.publish(payload)

    def post_stage_analysis(
        self,
        *,
        candidate: CandidateVariant,
        stage: str,
        stage_index: int,
        source_agent: str,
        target_agent: str,
        scores: dict[str, float],
        assumption_tags: list[str],
        branch_reason: str,
        baseline_scores: dict[str, float] | None,
    ) -> list[dict[str, Any]]:
        emitted: list[dict[str, Any]] = []
        cid = candidate["id"]
        prior = self.prior_scores.get(cid)
        baseline_ref = baseline_scores or self.baseline_scores_by_stage.get(stage_index)

        emitted.append(
            self.score_update(
                candidate=candidate,
                stage=stage,
                stage_index=stage_index,
                source_agent=target_agent,
                scores=scores,
                prior_reference=prior,
                baseline_reference=baseline_ref,
            )
        )

        prior_tags = self.candidate_assumptions.setdefault(cid, set())
        for evt in propagate_assumptions(
            candidate_id=cid,
            stage=stage,
            stage_index=stage_index,
            new_tags=assumption_tags,
            prior_tags=prior_tags,
            source_agent=target_agent,
        ):
            emitted.append(self.publish(evt))

        if baseline_ref and cid != "baseline":
            branch = detect_branch(
                candidate_id=cid,
                variant=candidate["variant"],
                scores=scores,
                baseline_scores=baseline_ref,
                stage=stage,
                stage_index=stage_index,
                branch_reason=branch_reason,
                assumption_tags=assumption_tags,
            )
            if branch and cid not in self.branched_candidates:
                self.branched_candidates.add(cid)
                emitted.append(
                    self.publish(
                        {
                            "type": "branch_detected",
                            **branch,
                            "sourceAgent": target_agent,
                            "targetAgent": "Simulation Engine",
                            "message": branch["branchReason"],
                        }
                    )
                )

        self.prior_scores[cid] = dict(scores)
        return emitted

    def bias_audit_flag(
        self,
        *,
        candidate: CandidateVariant,
        stage_index: int,
        scores: dict[str, float],
        baseline_scores: dict[str, float],
        severity: str,
        message: str,
    ) -> dict[str, Any]:
        return self.publish(
            {
                "type": "bias_audit_flag",
                "stage": "Bias Audit",
                "stageIndex": stage_index,
                "candidateId": candidate["id"],
                "variant": candidate["variant"],
                "sourceAgent": "Bias Auditor Agent",
                "targetAgent": "Simulation Engine",
                "severity": severity,
                "message": message,
                "technicalScore": scores.get("technicalScore"),
                "subjectiveScore": scores.get("subjectiveScore"),
                "confidence": scores.get("confidence"),
                "callbackProbability": scores.get("callbackProbability"),
                "confidenceDeltaVsBaseline": compute_deltas(scores, baseline_scores)[
                    "confidenceDelta"
                ],
                "callbackDeltaVsBaseline": compute_deltas(scores, baseline_scores)[
                    "callbackDelta"
                ],
            }
        )

    def stage_completed(self, stage: str, stage_index: int) -> dict[str, Any]:
        return self.publish(
            {
                "type": "stage_completed",
                "stage": stage,
                "stageIndex": stage_index,
                "message": f"{stage} complete for all variants.",
            }
        )

    def set_baseline_for_stage(self, stage_index: int, scores: dict[str, float]) -> None:
        self.baseline_scores_by_stage[stage_index] = dict(scores)


ScoreBundle = dict[str, float]


def require_emitter() -> SimulationEmitter:
    emitter = get_emitter()
    if emitter is None:
        raise RuntimeError("SimulationEmitter not initialized for this request")
    return emitter
