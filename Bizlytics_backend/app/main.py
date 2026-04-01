# =========================================================================
# BIZLYTICS SAAS - MAIN ENTRY POINT
# =========================================================================
# This is the heart of the backend. It initializes the FastAPI server,
# registers the multi-tenant middleware, and plugs in all the different
# features (Auth, Admin, Analytics, and Tenant management).

# =========================================================================
# BIZLYTICS ANALYTICS ENGINE (DuckDB)
# =========================================================================
# This module handles the high-speed analytical data storage.
# Unlike Postgres (which holds users), DuckDB holds the raw CSV/Excel numbers.
# It is designed to be completely isolated by company_id.

import logging
import threading
import traceback

from fastapi import FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.middleware.tenant import tenant_middleware

# Logging Configuration
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(
    title="Bizlytics API",
    description="Business Analytics Platform — Multi-tenant",
    version="1.0.0",
)
app.middleware("http")(tenant_middleware)

# Debug Logging Middleware
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info("[REQUEST] %s %s", request.method, request.url)
    try:
        response = await call_next(request)
        logger.info("[RESPONSE] %s", response.status_code)
        return response
    except Exception as e:
        logger.error("[CRITICAL ERROR] Middleware caught exception")
        traceback.print_exc()
        raise e


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.analytics import models as analytics_models

# Import models to ensure they are registered with Base.metadata before create_all
from app.auth import models as auth_models

# Initialize Database (Public Schema)
Base.metadata.create_all(bind=engine)

from app.ai.routes import router as ai_router  # noqa: E402

# Router imports (delayed to avoid circular dependencies)
from app.analytics.routes import router as analytics_router  # noqa: E402
from app.auth.admin_routes import router as admin_router  # noqa: E402
from app.auth.routes import router as auth_router  # noqa: E402
from app.tenant.routes import router as tenant_router  # noqa: E402

# Include Routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
app.include_router(tenant_router, prefix="/tenant", tags=["Tenant"])
app.include_router(ai_router, prefix="/ai", tags=["AI Analytics"])


@app.get("/")
async def root(request: Request, x_tenant_id: str = Header(default="default")):
    return {"message": "Bizlytics API Running", "tenant": x_tenant_id}
