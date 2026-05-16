from __future__ import annotations

from fastapi import APIRouter

from app.schemas.candidate import CandidateResponse
from app.services.resume_parser import get_demo_candidate
from app.services.variant_generator import generate_variants
from app.store import store

router = APIRouter()


@router.post("/seed", response_model=CandidateResponse)
async def seed_demo() -> CandidateResponse:
    candidate = get_demo_candidate()
    generate_variants(candidate)
    return CandidateResponse(
        candidate=candidate,
        variants=store.get_variant_ids(candidate.id),
    )
