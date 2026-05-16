from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph

from app.graph.nodes import call_model
from app.graph.state import GraphState


def build_graph():
    workflow = StateGraph(GraphState)
    workflow.add_node("agent", call_model)
    workflow.add_edge(START, "agent")
    workflow.add_edge("agent", END)

    checkpointer = MemorySaver()
    return workflow.compile(checkpointer=checkpointer)
