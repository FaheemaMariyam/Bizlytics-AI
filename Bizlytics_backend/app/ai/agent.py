import logging
import os
from typing import Annotated, Sequence, TypedDict

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage  #conversational messages 
from langchain_google_genai import ChatGoogleGenerativeAI 
from langgraph.graph import END, StateGraph  
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.ai.langchain_tools import create_tools_for_company

logger = logging.getLogger(__name__)

# 1. Define the State
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]


# 2. The System Prompt (The AI's "Personality")
SYSTEM_PROMPT = """You are a Senior Business Intelligence Analyst for Bizlytics.
Your job is to help HR managers understand their company's data.

RULES:
1. ALWAYS call the 'get_schema' tool FIRST to learn the available columns before writing any SQL.
2. Write DuckDB SQL queries to answer questions. Be precise and accurate.
3. When presenting results, format them in a clear, readable way.
4. If asked to create a chart, respond with a JSON block in this format:
   ```chart
   {"chart_type": "bar", "title": "...", "data": [{"label": "...", "value": ...}]}
   ```
5. Never guess or make up data. If you cannot find the answer, say so.
6. Keep responses concise and professional.
"""


def create_agent_graph(company_id: int):
    """Builds a LangGraph agent scoped to a specific company."""

    # Create company-scoped tools
    tools = create_tools_for_company(company_id)

    # Initialize the LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0,  # Zero temperature for precise, factual answers
    )
    llm_with_tools = llm.bind_tools(tools)

    # 3. Define the Nodes
    def call_model(state: AgentState):
        messages = state["messages"]

        # Inject system prompt if this is the first call
        if not any(isinstance(m, SystemMessage) for m in messages):
            messages = [SystemMessage(content=SYSTEM_PROMPT)] + list(messages)

        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}

    tool_node = ToolNode(tools)

    # 4. Define the Router (should_continue)
    def should_continue(state: AgentState):
        last_message = state["messages"][-1]
        if last_message.tool_calls:
            return "tools"
        return END

    # 5. Build the Graph
    workflow = StateGraph(AgentState)
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", tool_node)

    workflow.set_entry_point("agent")
    workflow.add_conditional_edges(
        "agent", should_continue, {"tools": "tools", END: END}
    )
    workflow.add_edge("tools", "agent")  # After tool execution, go back to agent

    return workflow.compile()
