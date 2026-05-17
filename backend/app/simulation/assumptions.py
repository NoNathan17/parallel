"""Track assumption tags as they propagate across hiring stages."""

from __future__ import annotations

from typing import Any


def propagate_assumptions(
    *,
    candidate_id: str,
    stage: str,
    stage_index: int,
    new_tags: list[str],
    prior_tags: set[str],
    source_agent: str,
) -> list[dict[str, Any]]:
    """Return assumption_propagated events for newly introduced tags."""
    events: list[dict[str, Any]] = []
    for tag in new_tags:
        if tag in prior_tags:
            continue
        prior_tags.add(tag)
        events.append(
            {
                "type": "assumption_propagated",
                "candidateId": candidate_id,
                "stage": stage,
                "stageIndex": stage_index,
                "sourceAgent": source_agent,
                "assumptionTag": tag,
                "message": f"Assumption `{tag.replace('_', ' ')}` introduced and will propagate downstream.",
                "propagationDepth": len(prior_tags),
            }
        )
    return events
