import logging

from fastapi import APIRouter, Depends, HTTPException
from langchain_core.messages import HumanMessage
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.agent import create_agent_graph
from app.auth.dependencies import require_hr
from app.auth.models import Company, User
from app.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    message: str


import json
import re

class ChatResponse(BaseModel):
    reply: str
    dashboard: dict | None = None


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
        result = agent.invoke({"messages": [HumanMessage(content=request.message)]})

        # 4. Extract the final AI response
        ai_response = result["messages"][-1].content
        
        # 5. Extract Dashboard JSON if present
        dashboard_data = None
        match = re.search(r"```(?:dashboard|json)\s*([\s\S]*?)```", ai_response)
        if match:
            try:
                dashboard_data = json.loads(match.group(1).strip())
            except Exception as je:
                logger.warning(f"Failed to parse dashboard JSON: {je}")

        return ChatResponse(reply=ai_response, dashboard=dashboard_data)

    except Exception as e:
        err_msg = str(e).lower()
        logger.error(f"AI Chat Error: {e}")
        
        # Check for rate limit or quota issues
        if "rate limit" in err_msg or "quota" in err_msg or "429" in err_msg:
            raise HTTPException(
                status_code=429, 
                detail="AI service quota reached. Please wait a few minutes before trying again."
            )
            
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
