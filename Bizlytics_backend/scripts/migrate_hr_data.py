import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import Column, DateTime, Enum, Integer, MetaData, String, Table, text

from app.auth.models import Company, HRStatus
from app.auth.tenant_models import HRAccount, TenantBase
from app.database import SessionLocal, engine, set_tenant_schema

# Temporary definition of the OLD HRAccount table in the public schema
# since it's now removed from models.py
metadata = MetaData()
old_hr_accounts = Table(
    "hr_accounts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("company_id", Integer, nullable=False),
    Column("email", String, nullable=False),
    Column("password_hash", String, nullable=False),
    Column("status", String),  # Using string to avoid enum issues
    Column("created_at", DateTime),
    schema="public",
)


def migrate_hrs():
    db = SessionLocal()
    try:
        # 1. Fetch all existing HRs from the public schema
        with engine.connect() as conn:
            print("Fetching existing HRs from public.hr_accounts...")
            try:
                results = conn.execute(old_hr_accounts.select()).fetchall()
                print(f"Found {len(results)} HR accounts to migrate.")
            except Exception as e:
                print(f"Error fetching old HRs (maybe table already gone?): {e}")
                return

        # 2. Iterate and move to correct schemas
        for row in results:
            hr_id, company_id, email, password_hash, status_val, created_at = row

            # Find the company schema
            company = db.query(Company).filter(Company.id == company_id).first()
            if not company:
                print(
                    f"Warning: Company ID {company_id} not found for HR {email}. Skipping."
                )
                continue

            print(f"Migrating HR {email} to schema {company.schema_name}...")

            # Switch to tenant schema
            set_tenant_schema(db, company.schema_name)

            # Ensure table exists in that schema
            with engine.connect() as tenant_conn:
                tenant_conn.execute(text(f"SET search_path TO {company.schema_name}"))
                TenantBase.metadata.create_all(bind=tenant_conn)
                tenant_conn.commit()

            # Check if already exists in tenant
            existing = db.query(HRAccount).filter(HRAccount.email == email).first()
            if not existing:
                new_hr = HRAccount(
                    email=email,
                    password_hash=password_hash,
                    status=status_val,
                    created_at=created_at,
                )
                db.add(new_hr)
                db.commit()
                print(f"Successfully migrated {email}.")
            else:
                print(f"HR {email} already exists in {company.schema_name}. Skipping.")

        # 3. Optional: Drop the old table (Safely)
        # print("Migration complete. You can now manually drop the public.hr_accounts table.")

    except Exception as e:
        print(f"Migration failed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    migrate_hrs()
