from __future__ import annotations

from pydantic import BaseModel, Field


class Education(BaseModel):
    institution: str
    degree: str = ""
    field: str = ""
    year: str = ""


class Project(BaseModel):
    name: str
    description: str
    technologies: list[str] = Field(default_factory=list)


class Experience(BaseModel):
    company: str
    title: str
    duration: str = ""
    description: str = ""


class Skill(BaseModel):
    name: str
    level: str = "proficient"


class BaseCandidate(BaseModel):
    id: str
    name: str
    email: str = ""
    target_role: str = "Software Engineer"
    education: list[Education] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    skills: list[Skill] = Field(default_factory=list)
    technical_summary: str = ""
    technical_equivalence_hash: str = ""

    def compute_equivalence_hash(self) -> str:
        parts = [
            self.technical_summary,
            "|".join(s.name for s in self.skills),
            "|".join(f"{p.name}:{p.description}" for p in self.projects),
            "|".join(f"{e.company}:{e.title}:{e.description}" for e in self.experience),
        ]
        return str(hash("::".join(parts)))


class CandidateCreateManual(BaseModel):
    name: str
    email: str = ""
    target_role: str = "Software Engineer"
    education: list[Education] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    skills: list[Skill] = Field(default_factory=list)
    technical_summary: str = ""


class CandidateResponse(BaseModel):
    candidate: BaseCandidate
    variants: list[str] = Field(default_factory=list)
