from contextlib import asynccontextmanager
from io import BytesIO

from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.candidate_generator import create_candidate_variants
from app.config import get_settings
from app.graph.builder import build_graph
from app.resume_parser import parse_resume_text
from app.schemas.simulation_api import SimulateRequest, SimulationEventCatalog
from app.services.simulation_service import stream_simulation
from app.simulation.interventions import INTERVENTION_LABELS

try:
    from pypdf import PdfReader

    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.graph = build_graph()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Parallel API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict[str, str | bool]:
        settings = get_settings()
        return {
            "status": "ok",
            "app": "parallel",
            "llm": bool(settings.openai_api_key.strip()),
        }

    @app.get("/simulate/schema")
    async def simulate_schema() -> SimulationEventCatalog:
        return SimulationEventCatalog()

    @app.get("/interventions")
    async def list_interventions() -> dict[str, str]:
        return INTERVENTION_LABELS

    async def _read_upload(file: UploadFile) -> str:
        content = await file.read()
        filename = (file.filename or "").lower()
        content_type = (file.content_type or "").lower()

        if filename.endswith(".txt") or content_type == "text/plain":
            return content.decode("utf-8", errors="replace")

        if filename.endswith(".pdf") or content_type == "application/pdf":
            if not PDF_AVAILABLE:
                raise HTTPException(
                    status_code=501,
                    detail="PDF parsing requires pypdf. Install with: pip install pypdf",
                )
            reader = PdfReader(BytesIO(content))
            pages = [page.extract_text() or "" for page in reader.pages]
            text = "\n".join(pages).strip()
            if not text:
                raise HTTPException(
                    status_code=422,
                    detail="Could not extract text from PDF. Try a text-based PDF or upload .txt.",
                )
            return text

        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Upload .txt or .pdf resume files.",
        )

    @app.post("/profile/preview")
    async def profile_preview(payload: SimulateRequest) -> dict:
        if not payload.resumeText.strip():
            raise HTTPException(status_code=422, detail="Resume text is empty")
        parsed = parse_resume_text(payload.resumeText)
        candidates = create_candidate_variants(parsed, payload.targetRole)
        return {
            "parsed": parsed,
            "candidates": [
                {
                    "id": c["id"],
                    "name": c["name"],
                    "variant": c["variant"],
                    "signal": c["signal"],
                    "resumeSnapshot": c["resume_snapshot"],
                }
                for c in candidates
            ],
        }

    @app.post("/simulate")
    async def simulate(request: Request) -> StreamingResponse:
        content_type = request.headers.get("content-type", "")
        interventions: list[str] = []
        is_replay = False

        if content_type.startswith("multipart/form-data"):
            form = await request.form()
            target_role = form.get("targetRole")
            if not target_role or not str(target_role).strip():
                raise HTTPException(status_code=422, detail="targetRole is required")
            upload = form.get("file")
            if upload is None or not hasattr(upload, "read"):
                raise HTTPException(status_code=422, detail="file is required for multipart upload")
            resume_text = await _read_upload(upload)  # type: ignore[arg-type]
            role = str(target_role).strip()
            raw_interventions = form.get("interventions")
            if raw_interventions:
                interventions = [
                    s.strip()
                    for s in str(raw_interventions).split(",")
                    if s.strip()
                ]
            is_replay = str(form.get("isReplay", "")).lower() in ("1", "true", "yes")
        else:
            body = await request.json()
            payload = SimulateRequest.model_validate(body)
            resume_text = payload.resumeText
            role = payload.targetRole
            interventions = payload.interventions
            is_replay = payload.isReplay

        if not resume_text.strip():
            raise HTTPException(status_code=422, detail="Resume text is empty")

        return StreamingResponse(
            stream_simulation(
                request.app.state.graph,
                resume_text,
                role,
                interventions=interventions,
                is_replay=is_replay,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return app


app = create_app()
