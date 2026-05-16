from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI

from app.config import get_settings
from app.graph.state import GraphState

SYSTEM_PROMPT = SystemMessage(
    content="You are a helpful assistant for the Parallel app. Be concise and practical."
)


def call_model(state: GraphState) -> dict:
    settings = get_settings()
    model = ChatOpenAI(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        temperature=0.2,
    )

    messages = [SYSTEM_PROMPT, *state["messages"]]
    response = model.invoke(messages)

    return {"messages": [response]}
