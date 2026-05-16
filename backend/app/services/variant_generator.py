from __future__ import annotations

import uuid

from app.schemas.candidate import BaseCandidate
from app.schemas.variant import (
    SIGNAL_DESCRIPTIONS,
    SIGNAL_LABELS,
    CandidateVariant,
    VariantSignal,
)
from app.store import store

DEFAULT_SIGNALS = [
    VariantSignal.BASELINE,
    VariantSignal.NONTRADITIONAL_BACKGROUND,
    VariantSignal.NO_REFERRAL,
    VariantSignal.ESL_COMMUNICATION,
    VariantSignal.SCHOOL_PRESTIGE,
]


def _build_overlay(signal: VariantSignal, base: BaseCandidate) -> dict:
    overlays: dict[VariantSignal, dict] = {
        VariantSignal.BASELINE: {},
        VariantSignal.NONTRADITIONAL_BACKGROUND: {
            "education_emphasis": "bootcamp_and_self_taught",
            "header_note": "Nontraditional path: bootcamp graduate, self-taught foundations",
            "credential_framing": "de_emphasize_traditional_degree",
        },
        VariantSignal.NO_REFERRAL: {
            "referral_status": "none",
            "application_source": "cold_apply",
            "internal_sponsor": None,
        },
        VariantSignal.ESL_COMMUNICATION: {
            "recruiter_phone_screen_notes": (
                "Candidate communicates clearly on technical topics but phrasing "
                "suggests non-native English patterns in behavioral responses."
            ),
            "communication_style_flag": "esl_patterns_noted",
        },
        VariantSignal.SCHOOL_PRESTIGE: {
            "institution_signal": "regional_state_university",
            "prestige_modifier": "lower_tier_listed",
            "original_institution_hidden": True,
        },
    }
    overlay = overlays.get(signal, {})
    if signal == VariantSignal.SCHOOL_PRESTIGE and base.education:
        overlay["display_institution"] = "Regional State University"
    return overlay


def get_existing_variants(base: BaseCandidate) -> list[CandidateVariant]:
    ids = store.get_variant_ids(base.id)
    return [store.variants[vid] for vid in ids if vid in store.variants]


def generate_variants(base: BaseCandidate, signals: list[VariantSignal] | None = None) -> list[CandidateVariant]:
    existing = get_existing_variants(base)
    if existing:
        return existing

    signals = signals or DEFAULT_SIGNALS
    eq_hash = base.technical_equivalence_hash or base.compute_equivalence_hash()
    variants: list[CandidateVariant] = []

    for signal in signals:
        variant_id = str(uuid.uuid4())
        label = SIGNAL_LABELS[signal]
        variant = CandidateVariant(
            id=variant_id,
            base_candidate_id=base.id,
            signal=signal,
            label=label,
            changed_signal=label,
            description=SIGNAL_DESCRIPTIONS[signal],
            context_overlay=_build_overlay(signal, base),
            name=base.name,
            target_role=base.target_role,
            education=[e.model_dump() for e in base.education],
            projects=[p.model_dump() for p in base.projects],
            experience=[e.model_dump() for e in base.experience],
            skills=[s.model_dump() for s in base.skills],
            technical_summary=base.technical_summary,
            technical_equivalence_hash=eq_hash,
        )
        store.variants[variant_id] = variant
        store.link_variant(base.id, variant_id)
        variants.append(variant)

    return variants
