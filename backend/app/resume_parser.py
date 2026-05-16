import re

from app.schemas import ParsedResume

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

SKILL_KEYWORDS = [
    "python",
    "javascript",
    "typescript",
    "react",
    "fastapi",
    "node",
    "sql",
    "postgresql",
    "aws",
    "docker",
    "kubernetes",
    "ai",
    "ml",
    "machine learning",
    "langchain",
    "langgraph",
    "java",
    "c++",
    "go",
    "rust",
    "git",
    "html",
    "css",
    "next.js",
    "django",
    "flask",
]

PROJECT_TERMS = ("project", "built", "developed", "app", "platform", "system", "tool")
EXPERIENCE_TERMS = (
    "intern",
    "developer",
    "engineer",
    "lead",
    "research",
    "analyst",
    "consultant",
    "fellow",
    "co-op",
    "software",
)
EDUCATION_TERMS = (
    "university",
    "college",
    "school",
    "b.s.",
    "b.a.",
    "m.s.",
    "ph.d",
    "computer science",
    "engineering",
    "degree",
    "gpa",
)


def parse_resume_text(text: str) -> ParsedResume:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    email_match = EMAIL_PATTERN.search(text)
    email = email_match.group(0) if email_match else ""

    name = ""
    for line in lines:
        if EMAIL_PATTERN.search(line):
            continue
        if len(line) < 80 and not any(term in line.lower() for term in ("skills", "experience")):
            name = line
            break

    lower_text = text.lower()
    skills = [kw.title() if kw.islower() and len(kw) <= 4 else kw for kw in SKILL_KEYWORDS if kw in lower_text]
    if "skills:" in lower_text:
        for line in lines:
            if "skills:" in line.lower():
                extra = [s.strip() for s in re.split(r"[:,]", line, maxsplit=1)[-1].split(",") if s.strip()]
                skills.extend(extra)

    skills = list(dict.fromkeys(skills))

    projects: list[str] = []
    experience: list[str] = []
    education: list[str] = []

    for line in lines:
        lower = line.lower()
        if any(term in lower for term in PROJECT_TERMS) and ("project" in lower or "app" in lower):
            projects.append(line)
        elif any(term in lower for term in EXPERIENCE_TERMS):
            experience.append(line)
        elif any(term in lower for term in EDUCATION_TERMS):
            education.append(line)

    if not projects:
        projects = [line for line in lines if "project" in line.lower()]
    if not experience:
        experience = [line for line in lines if any(t in line.lower() for t in EXPERIENCE_TERMS)]
    if not education:
        education = [line for line in lines if any(t in line.lower() for t in EDUCATION_TERMS)]

    summary_parts = []
    if skills:
        summary_parts.append(", ".join(skills[:6]))
    if projects:
        summary_parts.append(projects[0][:80])
    summary = (
        f"Candidate with {summary_parts[0]} experience."
        if summary_parts
        else "Candidate profile parsed from resume text."
    )

    return ParsedResume(
        name=name or "Candidate",
        email=email,
        education=education or ["Education details not explicitly listed"],
        skills=skills or ["General software development"],
        projects=projects or ["Portfolio projects referenced in resume"],
        experience=experience or ["Professional experience referenced in resume"],
        summary=summary,
    )
