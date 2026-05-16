"""Deterministic mock scores per variant and hiring stage."""

from app.schemas import CandidateVariant

STAGE_NAMES = [
    "Resume Parsing",
    "Variant Generation",
    "Resume Screening",
    "Recruiter Review",
    "Technical Interview",
    "Hiring Manager Review",
    "Bias Audit",
]

ScoreBundle = dict[str, float]

_VARIANT_IDS = ("baseline", "gender", "race", "socioeconomic")


def _bundle(
    technical: float,
    subjective: float,
    confidence: float,
    callback: float,
) -> ScoreBundle:
    return {
        "technicalScore": technical,
        "subjectiveScore": subjective,
        "confidence": confidence,
        "callbackProbability": callback,
    }


def score_resume_screener(candidate: CandidateVariant) -> ScoreBundle:
    vid = candidate["id"]
    technical = {"baseline": 87, "gender": 86, "race": 86, "socioeconomic": 87}[vid]
    subjective = {"baseline": 85, "gender": 82, "race": 76, "socioeconomic": 79}[vid]
    confidence = {"baseline": 0.82, "gender": 0.78, "race": 0.72, "socioeconomic": 0.75}[vid]
    callback = {"baseline": 0.80, "gender": 0.76, "race": 0.70, "socioeconomic": 0.73}[vid]
    return _bundle(technical, subjective, confidence, callback)


def score_recruiter(candidate: CandidateVariant) -> ScoreBundle:
    vid = candidate["id"]
    technical = {"baseline": 87, "gender": 86, "race": 86, "socioeconomic": 87}[vid]
    subjective = {"baseline": 88, "gender": 70, "race": 69, "socioeconomic": 68}[vid]
    confidence = {"baseline": 0.90, "gender": 0.62, "race": 0.61, "socioeconomic": 0.58}[vid]
    callback = {"baseline": 0.86, "gender": 0.50, "race": 0.48, "socioeconomic": 0.46}[vid]
    return _bundle(technical, subjective, confidence, callback)


def score_technical_interviewer(candidate: CandidateVariant) -> ScoreBundle:
    vid = candidate["id"]
    technical = {"baseline": 90, "gender": 89, "race": 88, "socioeconomic": 89}[vid]
    subjective = {"baseline": 89, "gender": 78, "race": 80, "socioeconomic": 79}[vid]
    confidence = {"baseline": 0.91, "gender": 0.74, "race": 0.76, "socioeconomic": 0.75}[vid]
    callback = {"baseline": 0.88, "gender": 0.68, "race": 0.66, "socioeconomic": 0.65}[vid]
    return _bundle(technical, subjective, confidence, callback)


def score_hiring_manager(candidate: CandidateVariant, prior: ScoreBundle) -> ScoreBundle:
    vid = candidate["id"]
    technical = prior["technicalScore"]
    subjective = {
        "baseline": 90,
        "gender": 72,
        "race": 71,
        "socioeconomic": 70,
    }[vid]
    confidence = {
        "baseline": 0.92,
        "gender": 0.60,
        "race": 0.58,
        "socioeconomic": 0.56,
    }[vid]
    callback = {
        "baseline": 0.90,
        "gender": 0.48,
        "race": 0.45,
        "socioeconomic": 0.44,
    }[vid]
    return _bundle(technical, subjective, confidence, callback)
