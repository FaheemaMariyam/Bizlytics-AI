from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/status")
async def get_tenant_status(request: Request):
    """
    Returns a simple status for the current tenant.
    """
    return {"tenant": request.state.tenant, "status": "active"}
