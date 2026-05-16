from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import get_settings
from app.schemas.candidate import CandidateCreateManual, CandidateResponse
from app.schemas.variant import VariantsResponse
from app.services.resume_parser import create_manual_candidate, parse_resume_pdf
from app.services.variant_generator import generate_variants
from app.store import store

router = APIRouter()


def _require_openai() -> None:
    if not get_settings().openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured.",
        )


@router.post("", response_model=CandidateResponse)
async def create_candidate_from_resume(
    file: UploadFile = File(...),
) -> CandidateResponse:
    _require_openai()
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    content = await file.read()
    try:
        candidate = await parse_resume_pdf(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {e}") from e

    return CandidateResponse(
        candidate=candidate,
        variants=store.get_variant_ids(candidate.id),
    )


@router.post("/manual", response_model=CandidateResponse)
async def create_candidate_manual(payload: CandidateCreateManual) -> CandidateResponse:
    candidate = create_manual_candidate(payload)
    return CandidateResponse(candidate=candidate, variants=[])


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(candidate_id: str) -> CandidateResponse:
    candidate = store.candidates.get(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    variant_ids = store.get_variant_ids(candidate_id)
    return CandidateResponse(candidate=candidate, variants=variant_ids)


@router.get("/{candidate_id}/variants", response_model=VariantsResponse)
async def list_variants(candidate_id: str) -> VariantsResponse:
    candidate = store.candidates.get(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    from app.services.variant_generator import get_existing_variants

    variants = get_existing_variants(candidate)
    return VariantsResponse(base_candidate_id=candidate_id, variants=variants)


@router.post("/{candidate_id}/variants", response_model=VariantsResponse)
async def create_variants(candidate_id: str) -> VariantsResponse:
    candidate = store.candidates.get(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    variants = generate_variants(candidate)
    return VariantsResponse(base_candidate_id=candidate_id, variants=variants)
