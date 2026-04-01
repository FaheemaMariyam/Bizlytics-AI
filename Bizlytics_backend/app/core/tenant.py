from sqlalchemy import text
from sqlalchemy.orm import Session

from app.analytics.models import RawUpload  # Ensure model is registered
from app.auth.tenant_models import HRAccount  # Ensure model is registered
from app.tenant.models import TenantBase


def create_tenant_schema(db: Session, schema_name: str):
    # 1. Create schema
    db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
    db.commit()

    # 2. Safely create ALL tenant tables inside schema
    from app.database import engine

    with engine.connect() as connection:
        connection.execute(text(f"SET search_path TO {schema_name}"))
        TenantBase.metadata.create_all(bind=connection)
        connection.commit()
