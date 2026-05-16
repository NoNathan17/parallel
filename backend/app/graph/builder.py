from langgraph.graph import END, START, StateGraph

from app.graph.nodes import (
    bias_auditor_node,
    generate_candidate_variants_node,
    hiring_manager_node,
    parse_resume_node,
    recruiter_node,
    resume_screener_node,
    technical_interviewer_node,
)
from app.schemas import SimulationState
from app.scoring import STAGE_NAMES


def build_graph():
    workflow = StateGraph(SimulationState)

    workflow.add_node("parse_resume", parse_resume_node)
    workflow.add_node("generate_candidate_variants", generate_candidate_variants_node)
    workflow.add_node("resume_screener", resume_screener_node)
    workflow.add_node("recruiter", recruiter_node)
    workflow.add_node("technical_interviewer", technical_interviewer_node)
    workflow.add_node("hiring_manager", hiring_manager_node)
    workflow.add_node("bias_auditor", bias_auditor_node)

    workflow.add_edge(START, "parse_resume")
    workflow.add_edge("parse_resume", "generate_candidate_variants")
    workflow.add_edge("generate_candidate_variants", "resume_screener")
    workflow.add_edge("resume_screener", "recruiter")
    workflow.add_edge("recruiter", "technical_interviewer")
    workflow.add_edge("technical_interviewer", "hiring_manager")
    workflow.add_edge("hiring_manager", "bias_auditor")
    workflow.add_edge("bias_auditor", END)

    return workflow.compile()


def initial_state(raw_resume_text: str, target_role: str) -> SimulationState:
    return SimulationState(
        target_role=target_role,
        raw_resume_text=raw_resume_text,
        parsed_resume=None,
        candidates=[],
        stages=STAGE_NAMES,
        events=[],
        final_feedback=None,
        current_stage_index=-1,
        stage_scores={},
    )
