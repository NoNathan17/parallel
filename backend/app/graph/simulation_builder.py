from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.graph.nodes.agent_round import AGENT_ORDER, run_agent_round
from app.graph.state import SimulationState
from app.schemas.simulation import AgentRole


def _make_node(agent: AgentRole):
    async def node(state: SimulationState) -> dict:
        return await run_agent_round(state, agent)

    node.__name__ = f"agent_{agent.value}"
    return node


def build_simulation_graph():
    workflow = StateGraph(SimulationState)

    for agent in AGENT_ORDER:
        workflow.add_node(agent.value, _make_node(agent))

    workflow.add_edge(START, AGENT_ORDER[0].value)
    for i in range(len(AGENT_ORDER) - 1):
        workflow.add_edge(AGENT_ORDER[i].value, AGENT_ORDER[i + 1].value)
    workflow.add_edge(AGENT_ORDER[-1].value, END)

    return workflow.compile()
