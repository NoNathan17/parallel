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
    technical = {"baseline": 87, "nontraditional": 86, "no_referral": 87, "esl": 86}[vid]
    subjective = {"baseline": 85, "nontraditional": 78, "no_referral": 84, "esl": 83}[vid]
    confidence = {"baseline": 0.82, "nontraditional": 0.74, "no_referral": 0.80, "esl": 0.79}[vid]
    callback = {"baseline": 0.80, "nontraditional": 0.72, "no_referral": 0.78, "esl": 0.77}[vid]
    return _bundle(technical, subjective, confidence, callback)


def score_recruiter(candidate: CandidateVariant) -> ScoreBundle:
    vid = candidate["id"]
    technical = {"baseline": 87, "nontraditional": 86, "no_referral": 87, "esl": 86}[vid]
    subjective = {"baseline": 88, "nontraditional": 71, "no_referral": 68, "esl": 81}[vid]
    confidence = {"baseline": 0.90, "nontraditional": 0.64, "no_referral": 0.60, "esl": 0.78}[vid]
    callback = {"baseline": 0.86, "nontraditional": 0.54, "no_referral": 0.48, "esl": 0.74}[vid]
    return _bundle(technical, subjective, confidence, callback)


def score_technical_interviewer(candidate: CandidateVariant) -> ScoreBundle:
    vid = candidate["id"]
    technical = {"baseline": 90, "nontraditional": 88, "no_referral": 89, "esl": 88}[vid]
    subjective = {"baseline": 89, "nontraditional": 82, "no_referral": 80, "esl": 64}[vid]
    confidence = {"baseline": 0.91, "nontraditional": 0.78, "no_referral": 0.76, "esl": 0.58}[vid]
    callback = {"baseline": 0.88, "nontraditional": 0.70, "no_referral": 0.68, "esl": 0.45}[vid]
    return _bundle(technical, subjective, confidence, callback)


def score_hiring_manager(candidate: CandidateVariant, prior: ScoreBundle) -> ScoreBundle:
    vid = candidate["id"]
    technical = prior["technicalScore"]
    subjective = {
        "baseline": 90,
        "nontraditional": 74,
        "no_referral": 70,
        "esl": 67,
    }[vid]
    confidence = {
        "baseline": 0.92,
        "nontraditional": 0.62,
        "no_referral": 0.58,
        "esl": 0.55,
    }[vid]
    callback = {
        "baseline": 0.90,
        "nontraditional": 0.52,
        "no_referral": 0.46,
        "esl": 0.42,
    }[vid]
    return _bundle(technical, subjective, confidence, callback)
