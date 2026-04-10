import logging
import os
from typing import Annotated, Sequence, TypedDict

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq
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
Your job is to help HR managers understand their company's data with precision and efficiency.

RULES:
1. ALWAYS call the 'get_schema' tool FIRST to learn the available columns before writing any SQL.
2. Write DuckDB SQL queries to answer specific questions. 
3. DATA PRIORITY: Always prioritize information retrieved from 'query_data' tool. 
4. **PROFESSIONAL PRESENTATION (Tables & Totals)**:
   - ALWAYS report the **Total Count** (e.g., "I found 50 employees...").
   - Display data in **Markdown Tables**. If there are many rows, show the **top 10**.
   - **READABILITY**: If a dataset has >8 columns, select the **5-8 most relevant/essential columns** for the chat table to avoid horizontal messiness. Mention that more details are available.
   - If `is_truncated` is true, mention that you're showing a sample and offer to drill down further.
   - Bold key metrics for readability.
5. DATA ACCURACY: Never guess or make up data. If you are unsure about a column name, check the schema again. 
6. If asked to "make", "generate", or "create" a dashboard:
   - ALWAYS include the verbatim token [SUGGEST_DASHBOARD] in your text response.
   - Provide a **Dashboard Summary Table** (Columns: Component, Metric, Value/Insight).
   - **MANDATORY**: You MUST also include a JSON code block of type 'dashboard' containing the structured data for the proposed charts.
   - Format: ```dashboard {"title": "Targeted Analysis", "charts": [{"chart_type": "bar", "title": "Metric Name", "data": [{"label": "A", "value": 10}]}]} ```
7. If asked for a specific chart, use the format: ```chart {"chart_type": "...", "title": "...", "data": [...]} ```
8. Never output raw JSON unless specifically requested.
"""


def create_agent_graph(company_id: int):
    """Builds a LangGraph agent scoped to a specific company."""

    # 1. Fetch Company Data Context (Pre-computed summaries)
    from app.analytics.duckdb_manager import get_connection
    context_str = ""
    try:
        with get_connection(company_id, read_only=True) as con:
            tables = con.execute("SHOW TABLES").fetchall()
            table_list = [t[0] for t in tables]
            
            if "bi_reports" in table_list:
                df = con.execute("SELECT type, label, value FROM bi_reports").df()
                context_str += f"\n--- GLOBAL BUSINESS SUMMARY (Whole File) ---\n{df.to_string(index=False)}\n"
            
            if "aggregations" in table_list:
                df = con.execute("SELECT column_name, total, average, maximum FROM aggregations").df()
                context_str += f"\n--- GLOBAL TECHNICAL STATS (Whole File) ---\n{df.to_string(index=False)}\n"
    except Exception as e:
        logger.warning(f"Could not load context for agent: {e}")

    # 2. Create company-scoped tools
    tools = create_tools_for_company(company_id)

    # Initialize the LLM
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=os.getenv("GROQ_API_KEY"),
        temperature=0,
    )
    llm_with_tools = llm.bind_tools(tools)

    # 3. Define the Nodes
    def call_model(state: AgentState):
        messages = state["messages"]

        # Inject system prompt + data context if this is the first call
        if not any(isinstance(m, SystemMessage) for m in messages):
            full_prompt = SYSTEM_PROMPT + (f"\n\nIMPORTANT: Use the following for high-level context ONLY:\n{context_str}" if context_str else "")
            messages = [SystemMessage(content=full_prompt)] + list(messages)

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
