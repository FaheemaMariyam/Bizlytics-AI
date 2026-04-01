import os

from dotenv import load_dotenv
from fastapi import Request
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL, pool_size=5, max_overflow=10, pool_recycle=3600, pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine, expire_on_commit=False
)

Base = declarative_base()


# =========================================================================
# SAAS DATABASE & MULTI-TENANCY CORE
# =========================================================================


def get_db(request: Request):
    """
    DEPENDENCY INJECTION: Provides an isolated DB session to any API endpoint.
    It retrieves the session already pre-scoped by the 'tenant_middleware'.
    """
    db = getattr(request.state, "db", None)
    if db is None:
        # FALLBACK: If a request somehow bypasses the middleware (or for background tasks),
        # we create a session and manually set the tenant scale here.
        db = SessionLocal()
        tenant = request.headers.get("X-Tenant-ID", "public")
        set_tenant_schema(db, tenant)
        try:
            yield db
        finally:
            db.close()
    else:
        # Standard flow: Use the already scoped session from middleware.
        yield db


def set_tenant_schema(db, tenant: str):
    """
    POSTGRES SCHEMA SWITCHING:
    This function physically isolates data by changing the Postgres 'search_path'.
    If 'tenant' is 'company_abc', the database will ONLY query tables inside the
    'company_abc' schema, completely hiding data from other companies.
    """
    if not tenant:
        tenant = "public"

    db.execute(text(f"SET search_path TO {tenant}, public"))
