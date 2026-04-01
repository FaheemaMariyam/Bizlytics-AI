from fastapi import Request

from app.database import SessionLocal, set_tenant_schema

# =========================================================================
# SAAS MULTI-TENANT MIDDLEWARE
# =========================================================================
# This is the "Traffic Controller" for the entire SaaS.
# For every incoming HTTP request, it identifies which company (tenant)
# is making the call and ensures the database only shows that company's data.


async def tenant_middleware(request: Request, call_next):
    # 1. EXTRACT TENANT IDENTIFIER
    # Currently, we look for the 'X-Tenant-ID' header (e.g., 'company_abc_company').
    # FUTURE: This logic will be updated to extract the SUBDOMAIN from the URL.
    tenant = request.headers.get("X-Tenant-ID", "public")
    request.state.tenant = tenant

    # 2. ISOLATE DATABASE SESSION
    # We create a fresh, isolated database session for this specific request.
    db = SessionLocal()

    # 3. SET TENANT SCOPE (PostgreSQL 'search_path')
    # This is the "Magic" line. It runs: SET search_path TO {tenant}, public.
    # It ensures the database engine ONLY looks at the specific company's schema.
    set_tenant_schema(db, tenant)

    # 4. ATTACH TO REQUEST STATE
    # We store the pre-configured session so our Routes (Endpoints) can use it.
    request.state.db = db

    try:
        # Pass the request down to the actual API endpoint
        response = await call_next(request)
        return response
    finally:
        # 5. SECURE CLEANUP
        # Critically important: We close the session to free up database connections.
        db.close()
