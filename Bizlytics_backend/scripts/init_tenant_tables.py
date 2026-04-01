import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text

from app.analytics.models import RawUpload  # Must import all models using TenantBase
from app.auth.models import Company  # Essential for FK resolution
from app.auth.tenant_models import HRAccount  # Importing other tenant models
from app.database import SessionLocal, engine, set_tenant_schema
from app.tenant.models import TenantBase


def init_tenant_tables():
    db = SessionLocal()
    try:
        companies = db.query(Company).all()

        for company in companies:
            print(f"Creating tables for tenant: {company.schema_name}")

            # The correct way to create tables in a specific schema using SQLAlchemy
            with engine.connect() as connection:
                connection.execute(text(f"SET search_path TO {company.schema_name}"))
                TenantBase.metadata.create_all(bind=connection)
                connection.commit()

        print("Successfully created tenant tables for all existing companies!")
    except Exception as e:
        print(f"Error initializing tenant tables: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    init_tenant_tables()
