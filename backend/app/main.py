from contextlib import asynccontextmanager
from io import BytesIO

from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import get_settings
from app.graph.builder import build_graph
from app.services.simulation_service import stream_simulation

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

    class SimulateJsonBody(BaseModel):
        resumeText: str = Field(..., min_length=1)
        targetRole: str = Field(..., min_length=1)

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

    @app.post("/simulate")
    async def simulate(request: Request) -> StreamingResponse:
        content_type = request.headers.get("content-type", "")

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
        else:
            body = await request.json()
            payload = SimulateJsonBody.model_validate(body)
            resume_text = payload.resumeText
            role = payload.targetRole

        if not resume_text.strip():
            raise HTTPException(status_code=422, detail="Resume text is empty")

        return StreamingResponse(
            stream_simulation(request.app.state.graph, resume_text, role),
            media_type="text/event-stream",
        )

    return app


app = create_app()
