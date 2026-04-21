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
SYSTEM_PROMPT = """You are **Bizlytics AI**, a Senior Business Intelligence Analyst.
Your goal is to provide HIGH-ACCURACY insights by querying the company's DuckDB database.

### ─── ACCURACY & TOOL RULES ───
1. **SCHEMA FIRST**: ALWAYS call `get_schema` before writing any SQL query. This ensures you use the correct column names for the active file.
2. **TECHNICAL QUESTIONS**: If the user asks for a specific metric (e.g., "Total revenue for March"), **ALWAYS use `query_data`**. Never guess or hallucinate numbers.
3. **PREMIUM FORMATTING**: When presenting data summaries in text:
    - **MANDATORY**: Use Markdown Tables (e.g., | Category | Value |) for any list of 3+ items.
    - **PROHIBITED**: Never use simple colon-separated lists (e.g., "North: 267") for multi-item data.
    - Use **bold headers** and clear sections with Dividers (---).
    - Format all currency as `$1,234.56` and percentages as `12.3%`.
    - ALWAYS ensure numbers are easy to read at a glance.

### ─── THE EXECUTIVE DASHBOARD MANDATE ───
- NEVER generate a ` ```dashboard ` JSON block if the user asks for a simple analytical answer, questions the data, or explicitly says "not the dashboard". Use plain text to answer them instead.
- Only generate the dashboard when the user explicitly says "dashboard", "visualize", or "generate report".
- ALWAYS write a brief conversational introduction before outputting the ` ```dashboard ` block. Do not leave the text channel empty!
- For full dashboards, ALWAYS wrap your JSON in a ` ```dashboard ` block (NOT json). Use this schema:
```dashboard
{
  "title": "Dashboard Title",
  "charts": [
    {
      "title": "Chart Title",
      "chart_type": "bar",
      "data": [
        {"label": "...", "value": 0}
      ]
    }
  ]
}
```
- IMPORTANT: Available `chart_type` values are: "bar", "donut", "area", "kpi". You MUST use a diverse mix of these chart types! Do not just use 'bar' for everything. Use 'donut' for distributions (e.g. Sales by Category), 'area' for trends (e.g. Dates), and 'kpi' for core standalone metrics.
- Use the `PRE-COMPUTED BI SUMMARIES` provided in your context to populate the data array quickly.
"""


def create_agent_graph(company_id: int):
    """Builds a LangGraph agent scoped to a specific company."""

    from app.analytics.duckdb_manager import get_connection
    from app.analytics.models import RawUpload
    from app.database import SessionLocal
    
    context_str = ""
    freshness_info = ""
    
    try:
        # 1.1 Resolve Schema and Check Latest Status (Postgres)
        from app.auth.models import Company
        from app.database import set_tenant_schema
        
        pg_db = SessionLocal()
        # Find which schema belongs to this company_id
        company = pg_db.query(Company).filter(Company.id == company_id).first()
        if company:
            # Set search_path for RawUpload lookup
            set_tenant_schema(pg_db, company.schema_name)
            latest_upload = pg_db.query(RawUpload).order_by(RawUpload.created_at.desc()).first()
        else:
            latest_upload = None
        pg_db.close()
        
        # 1.2 Fetch DuckDB Context
        with get_connection(company_id, read_only=True) as con:
            table_list = [t[0] for t in con.execute("SHOW TABLES").fetchall()]
            
            active_upload_id = None
            if "bi_reports" in table_list:
                df = con.execute("SELECT type, label, value FROM bi_reports").df()
                
                # Metadata Check
                meta_row = df[df['type'] == 'meta_upload_id']
                if not meta_row.empty:
                    active_upload_id = int(meta_row.iloc[0]['value'])
                
                # High-level context for dashboards ONLY
                visible_df = df[df['type'] != 'meta_upload_id']
                context_str += f"\n[PRE-COMPUTED BI SUMMARIES (Use for Dashboards ONLY)]\n{visible_df.to_csv(index=False)}\n"
        
        # 1.3 Detect Stale/Failed State
        if latest_upload:
            active_filename = latest_upload.filename
            if latest_upload.status == "processing":
                freshness_info = f"File '{active_filename}' is still processing. Data below is from the PREVIOUS file."
            elif latest_upload.status == "failed":
                freshness_info = f"Latest upload '{active_filename}' FAILED. Showing data from the last valid file."
            elif active_upload_id and latest_upload.id != active_upload_id:
                freshness_info = f"DATA DELAY: I am still seeing the previous file. '{active_filename}' is queued for sync."

    except Exception as e:
        logger.warning(f"Could not load context for agent: {e}")

    # 2. Create tools
    tools = create_tools_for_company(company_id)

    # 4. Define Nodes
    def call_model(state: AgentState):
        messages = state["messages"]

        # Inject system prompt if first call
        if not any(isinstance(m, SystemMessage) for m in messages):
            data_context = f"\nSTATUS: {freshness_info}\nCONTEXT: {context_str}" if (freshness_info or context_str) else ""
            messages = [SystemMessage(content=SYSTEM_PROMPT + data_context)] + list(messages)

        # Dynamic Fallback Chain to ensure "Smooth" experience
        models_to_try = [
            os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            "llama-3.1-70b-versatile",
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant"  # Backup if the .env custom model is down
        ]
        
        # Unique list preserving order
        seen = set()
        fallback_chain = [x for x in models_to_try if not (x in seen or seen.add(x))]

        last_error = None
        for model_name in fallback_chain:
            try:
                # Initialize LLM for this specific attempt
                llm = ChatGroq(
                    model=model_name,
                    groq_api_key=os.getenv("GROQ_API_KEY"),
                    temperature=0,
                    max_tokens=3000,  # Increased to prevent truncation for large dashboards
                    max_retries=0, 
                )
                llm_with_tools = llm.bind_tools(tools)
                
                response = llm_with_tools.invoke(messages)
                return {"messages": [response]}
            except Exception as e:
                last_error = e
                msg = str(e).lower()
                # Catch Rate Limits (429), Decommissioned/Invalid (400), or Tool Use bugs
                if any(kw in msg for kw in ["429", "quota", "rate limit", "400", "decommissioned", "tool_use_failed"]):
                    logger.warning(f"Fallback Triggered: Model '{model_name}' failed. Trying next. Error: {e}")
                    continue
                else:
                    # Authentication or Code Errors should fail fast
                    logger.error(f"Fatal error with model '{model_name}': {e}")
                    raise e
        
        # If even fallback fails, raise the final error
        raise last_error

    tool_node = ToolNode(tools)

    # 5. Define Graph
    def should_continue(state: AgentState):
        last_message = state["messages"][-1]
        return "tools" if last_message.tool_calls else END

    workflow = StateGraph(AgentState)
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", tool_node)
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    workflow.add_edge("tools", "agent")

    return workflow.compile()
