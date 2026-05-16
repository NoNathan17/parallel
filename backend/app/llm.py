import json
import logging
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.config import get_settings
from app.schemas import CandidateVariant, FinalFeedback

logger = logging.getLogger(__name__)


def is_llm_enabled() -> bool:
    settings = get_settings()
    return bool(settings.openai_api_key.strip())


def enhance_audit_feedback(
    *,
    target_role: str,
    candidates: list[CandidateVariant],
    final_scores: dict[str, dict[str, float]],
    divergence_points: list[str],
    key_findings: list[str],
    fallback: FinalFeedback,
) -> FinalFeedback:
    if not is_llm_enabled():
        return fallback

    settings = get_settings()
    score_lines = []
    for c in candidates:
        s = final_scores.get(c["id"], {})
        score_lines.append(
            f"- {c['variant']}: technical={s.get('technicalScore', 'n/a')}, "
            f"subjective={s.get('subjectiveScore', 'n/a')}, "
            f"confidence={s.get('confidence', 'n/a')}, "
            f"callback={s.get('callbackProbability', 'n/a')}; signal={c['signal']}"
        )

    system = SystemMessage(
        content=(
            "You are the Bias Auditor for Parallel, a hiring fairness simulation. "
            "Given score trajectories for equivalent-qualification candidate variants, "
            "write a concise audit. Respond with JSON only, no markdown fences, using keys: "
            "summary (string), key_findings (string[]), divergence_points (string[]), "
            "suggested_interventions (string[]), fairness_delta_placeholder (string). "
            "Preserve factual divergence from the input; do not invent skills gaps when technical scores are close."
        )
    )
    human = HumanMessage(
        content=(
            f"Target role: {target_role}\n\n"
            f"Final scores:\n" + "\n".join(score_lines) + "\n\n"
            f"Detected divergence points:\n"
            + ("\n".join(divergence_points) or "(none)") + "\n\n"
            f"Detected key findings:\n"
            + ("\n".join(key_findings) or "(none)")
        )
    )

    try:
        model = ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            temperature=0.3,
        )
        response = model.invoke([system, human])
        raw = response.content if isinstance(response.content, str) else str(response.content)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
        return FinalFeedback(
            summary=data.get("summary", fallback["summary"]),
            key_findings=data.get("key_findings") or fallback["key_findings"],
            divergence_points=data.get("divergence_points") or fallback["divergence_points"],
            suggested_interventions=data.get("suggested_interventions")
            or fallback["suggested_interventions"],
            fairness_delta_placeholder=data.get(
                "fairness_delta_placeholder", fallback["fairness_delta_placeholder"]
            ),
        )
    except Exception:
        logger.exception("LLM audit enhancement failed; using deterministic fallback")
        return fallback
