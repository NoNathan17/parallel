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
        f"Inclusivity signal (evaluation context only): {signal_note}",
    ]
    return "\n".join(sections)


def create_candidate_variants(parsed_resume: ParsedResume, target_role: str) -> list[CandidateVariant]:
    base_name = parsed_resume["name"]
    role_note = f"Applying for: {target_role}"

    definitions = [
        {
            "id": "baseline",
            "variant": "Baseline",
            "signal": "Reference profile with dominant-norm hiring signals; traditional path and strong network",
            "hidden_context": {
                "dimension": "baseline",
                "referral": True,
                "role": role_note,
            },
            "signal_note": "Traditional elite-path signals; employee referral; default hiring heuristic",
        },
        {
            "id": "gender",
            "variant": "Gender",
            "signal": "Equivalent qualifications; gender-associated name and affiliation signals that may trigger stereotyping",
            "hidden_context": {
                "dimension": "gender",
                "referral": False,
                "role": role_note,
            },
            "signal_note": "Signals associated with women in tech contexts; same projects and tenure",
        },
        {
            "id": "race",
            "variant": "Race & Ethnicity",
            "signal": "Equivalent qualifications; racial/ethnic identity signals (name, community, school context)",
            "hidden_context": {
                "dimension": "race_ethnicity",
                "referral": False,
                "role": role_note,
            },
            "signal_note": "Underrepresented racial/ethnic identity signals; HBCU or community org context",
        },
        {
            "id": "socioeconomic",
            "variant": "Socioeconomic Background",
            "signal": "Equivalent qualifications; first-generation and low-network socioeconomic signals",
            "hidden_context": {
                "dimension": "socioeconomic",
                "referral": False,
                "role": role_note,
            },
            "signal_note": "First-gen college; regional public university; no legacy or elite-network cues",
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
