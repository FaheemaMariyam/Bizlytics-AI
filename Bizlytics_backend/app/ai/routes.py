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
        result = agent.invoke({"messages": [HumanMessage(content=request.message)]})

        # 4. Extract the final AI response
        ai_response = result["messages"][-1].content
        return ChatResponse(reply=ai_response)

    except Exception as e:
        logger.error(f"AI Chat Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
