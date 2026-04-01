# Agentic AI Setup: Step-by-Step Guide

This guide walks through every step needed to implement the Agentic AI Chatbot for Bizlytics, from environment setup to the final chat endpoint.

---

## Phase 0: Environment Setup

### Step 0.1: Get the Gemini API Key
1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Click **"Create API Key."**
3. Copy the key.

### Step 0.2: Add the Key to `.env`
Open `Bizlytics_backend/.env` and add:
```
GOOGLE_API_KEY=your_gemini_api_key_here
```

### Step 0.3: Add the Key to `app/core/config.py`
Add this line below the existing config variables:
```python
GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
```

### Step 0.4: Install the AI Libraries
Run inside `Bizlytics_backend/`:
```bash
pip install langgraph langchain-google-genai langchain-core langchain-community
```

> **Status Check:** `app/ai/__init__.py` and `app/ai/tools.py` already exist with working tools. Phase 1 is partially done.

---

## Phase 1: Tools (Already Partially Done)

### What Already Exists in `app/ai/tools.py`:
- `get_company_schema_info(company_id)` — Fetches table schema from DuckDB.
- `run_analytics_query(company_id, sql_query)` — Executes safe, read-only SQL on the company's data.

These are the "Hands" of the AI. They are already built correctly.

### Step 1.1: Wrap the Tools for LangGraph
LangGraph needs tools to be decorated with `@tool` from LangChain. Create a new file:

**File:** `app/ai/langchain_tools.py`

```python
import json
from langchain_core.tools import tool
from app.ai.tools import get_company_schema_info, run_analytics_query

# These will be called with a fixed company_id injected at runtime.
# We create wrapper functions that the agent graph will bind.

def create_tools_for_company(company_id: int):
    """Creates LangChain-compatible tools scoped to a specific company."""

    @tool
    def query_data(sql_query: str) -> str:
        """
        Execute a read-only SQL query on the company's analytics data in DuckDB.
        Only SELECT queries are allowed. Use this to answer questions about the data.
        Returns the query results as a JSON string.
        """
        results = run_analytics_query(company_id, sql_query)
        return json.dumps(results, default=str)

    @tool
    def get_schema() -> str:
        """
        Get the table schema (column names and types) for the company's data.
        Always call this FIRST before writing any SQL query so you know what columns exist.
        """
        return get_company_schema_info(company_id)

    return [get_schema, query_data]
```

---

## Phase 2: Agent Logic (The "Brain")

### Step 2.1: Create the Agent Graph
**File:** `app/ai/agent.py`

```python
import os
import logging
from typing import Annotated, TypedDict, Sequence

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
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
        model="gemini-1.5-flash",
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
    workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    workflow.add_edge("tools", "agent")  # After tool execution, go back to agent

    return workflow.compile()
```

---

## Phase 3: API Integration

### Step 3.1: Create the Chat Route
**File:** `app/ai/routes.py`

```python
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage

from app.ai.agent import create_agent_graph
from app.auth.dependencies import require_hr
from app.auth.models import User, Company
from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr),
):
    """
    Chat endpoint for the AI analytics assistant.
    The AI is scoped to the current user's company data only.
    """
    # 1. Get the company_id for this user
    company = (
        db.query(Company)
        .filter(Company.schema_name == current_user.schema_name)
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    try:
        # 2. Create a company-scoped agent
        agent = create_agent_graph(company.id)

        # 3. Run the agent with the user's message
        result = agent.invoke({
            "messages": [HumanMessage(content=request.message)]
        })

        # 4. Extract the final AI response
        ai_response = result["messages"][-1].content
        return ChatResponse(reply=ai_response)

    except Exception as e:
        logger.error(f"AI Chat Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
```

### Step 3.2: Register the Router in `app/main.py`
Add these two lines alongside your other router imports (around line 77):

```python
from app.ai.routes import router as ai_router
```

And in the "Include Routers" section:

```python
app.include_router(ai_router, prefix="/ai", tags=["AI Analytics"])
```

---

## Phase 4: Verification

### Step 4.1: Test the Setup
1. Start the backend server: `uvicorn app.main:app --reload`
2. Open `http://localhost:8000/docs`
3. Find the **`POST /ai/chat`** endpoint.
4. Authenticate with an HR user's Bearer token.
5. Send this test message:
```json
{
  "message": "What columns are available in my data?"
}
```

### Step 4.2: Test a Real Query
```json
{
  "message": "Show me the total count of rows in my data"
}
```

### Step 4.3: Test Chart Generation
```json
{
  "message": "Create a bar chart showing the top 5 categories by count"
}
```

---

## File Summary

| File | Purpose |
|:---|:---|
| `.env` | Add `GOOGLE_API_KEY` |
| `app/core/config.py` | Load the new env variable |
| `app/ai/tools.py` | Already exists (raw DuckDB tools) |
| `app/ai/langchain_tools.py` | **[NEW]** LangChain wrappers for the tools |
| `app/ai/agent.py` | **[NEW]** The LangGraph agent (brain) |
| `app/ai/routes.py` | **[NEW]** The `/ai/chat` FastAPI endpoint |
| `app/main.py` | Register the new AI router |
