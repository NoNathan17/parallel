from __future__ import annotations

import io
import uuid

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pypdf import PdfReader
from pydantic import BaseModel, Field

from app.config import get_settings
from app.schemas.candidate import (
    BaseCandidate,
    CandidateCreateManual,
    Education,
    Experience,
    Project,
    Skill,
)
from app.store import store


class ParsedResume(BaseModel):
    name: str
    email: str = ""
    target_role: str = "Software Engineer"
    education: list[Education] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    skills: list[Skill] = Field(default_factory=list)
    technical_summary: str = ""


def extract_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages).strip()


def _to_candidate(parsed: ParsedResume | CandidateCreateManual) -> BaseCandidate:
    candidate_id = str(uuid.uuid4())
    candidate = BaseCandidate(
        id=candidate_id,
        name=parsed.name,
        email=getattr(parsed, "email", "") or "",
        target_role=parsed.target_role,
        education=parsed.education,
        projects=parsed.projects,
        experience=parsed.experience,
        skills=parsed.skills,
        technical_summary=parsed.technical_summary,
    )
    candidate.technical_equivalence_hash = candidate.compute_equivalence_hash()
    store.candidates[candidate_id] = candidate
    return candidate


async def parse_resume_text(resume_text: str) -> BaseCandidate:
    settings = get_settings()
    model = ChatOpenAI(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        temperature=0.1,
    )
    structured = model.with_structured_output(ParsedResume)
    result = await structured.ainvoke(
        [
            SystemMessage(
                content=(
                    "Extract structured candidate profile from resume text. "
                    "Be thorough on education, projects, experience, and skills. "
                    "Write a technical_summary capturing engineering ability only."
                )
            ),
            HumanMessage(content=f"Resume text:\n\n{resume_text}"),
        ]
    )
    return _to_candidate(result)


async def parse_resume_pdf(file_bytes: bytes) -> BaseCandidate:
    text = extract_pdf_text(file_bytes)
    if not text:
        raise ValueError("Could not extract text from PDF")
    return await parse_resume_text(text)


def create_manual_candidate(payload: CandidateCreateManual) -> BaseCandidate:
    return _to_candidate(payload)


def get_demo_candidate() -> BaseCandidate:
    demo = CandidateCreateManual(
        name="Alex Chen",
        email="alex.chen@email.com",
        target_role="Software Engineer",
        education=[
            Education(
                institution="State University",
                degree="B.S.",
                field="Computer Science",
                year="2022",
            )
        ],
        projects=[
            Project(
                name="Distributed Task Queue",
                description="Built a Redis-backed job queue handling 10k jobs/min with retry logic and dead-letter handling.",
                technologies=["Python", "Redis", "FastAPI"],
            ),
            Project(
                name="Real-time Analytics Dashboard",
                description="React dashboard with WebSocket feeds, sub-100ms update latency for 50 concurrent users.",
                technologies=["TypeScript", "React", "WebSockets"],
            ),
        ],
        experience=[
            Experience(
                company="TechStartup Inc",
                title="Software Engineer",
                duration="2022–2024",
                description="Shipped 3 production features; reduced API latency 40%; mentored 1 intern.",
            )
        ],
        skills=[
            Skill(name="Python", level="advanced"),
            Skill(name="TypeScript", level="advanced"),
            Skill(name="System Design", level="proficient"),
            Skill(name="PostgreSQL", level="proficient"),
        ],
        technical_summary=(
            "Strong full-stack engineer with production experience in distributed systems, "
            "API design, and real-time data pipelines. Demonstrated impact at early-stage startup."
        ),
    )
    return _to_candidate(demo)
