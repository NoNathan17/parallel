from app.schemas import CandidateVariant, ParsedResume


def _build_snapshot(parsed: ParsedResume, signal_note: str) -> str:
    sections = [
        f"Name: {parsed['name']}",
        f"Email: {parsed['email']}",
        f"Summary: {parsed['summary']}",
        f"Skills: {', '.join(parsed['skills'])}",
        f"Education: {'; '.join(parsed['education'])}",
        f"Projects: {'; '.join(parsed['projects'])}",
        f"Experience: {'; '.join(parsed['experience'])}",
        f"Contextual signal (evaluation only): {signal_note}",
    ]
    return "\n".join(sections)


def create_candidate_variants(parsed_resume: ParsedResume, target_role: str) -> list[CandidateVariant]:
    base_name = parsed_resume["name"]
    role_note = f"Applying for: {target_role}"

    definitions = [
        {
            "id": "baseline",
            "variant": "Baseline",
            "signal": "Standard professional background with strong referral and traditional path",
            "hidden_context": {
                "referral": True,
                "background_type": "traditional",
                "esl": False,
                "role": role_note,
            },
            "signal_note": "Traditional CS path; employee referral on file",
        },
        {
            "id": "nontraditional",
            "variant": "Nontraditional Background",
            "signal": "Equivalent skills via bootcamp and career pivot from unrelated field",
            "hidden_context": {
                "referral": False,
                "background_type": "nontraditional",
                "esl": False,
                "role": role_note,
            },
            "signal_note": "Bootcamp graduate; career changer; no Ivy League signaling",
        },
        {
            "id": "no_referral",
            "variant": "No Referral",
            "signal": "Same qualifications as baseline but no internal referral or warm introduction",
            "hidden_context": {
                "referral": False,
                "background_type": "traditional",
                "esl": False,
                "role": role_note,
            },
            "signal_note": "Cold application; no employee referral",
        },
        {
            "id": "esl",
            "variant": "ESL Communication Style",
            "signal": "Strong technical background; non-native English communication patterns in interview",
            "hidden_context": {
                "referral": True,
                "background_type": "traditional",
                "esl": True,
                "role": role_note,
            },
            "signal_note": "First-language fluency differs; thoughtful but less idiomatic verbal delivery",
        },
    ]

    variants: list[CandidateVariant] = []
    for spec in definitions:
        variants.append(
            CandidateVariant(
                id=spec["id"],
                name=base_name,
                variant=spec["variant"],
                signal=spec["signal"],
                resume_snapshot=_build_snapshot(parsed_resume, spec["signal_note"]),
                hidden_context=spec["hidden_context"],
            )
        )
    return variants
