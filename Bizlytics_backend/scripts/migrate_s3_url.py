import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal
from app.auth.models import Company
from sqlalchemy import text

def migrate_schema():
    db = SessionLocal()
    try:
        companies = db.query(Company).all()
        for company in companies:
            print(f"Migrating table for tenant: {company.schema_name}")
            with engine.connect() as connection:
                connection.execute(text(f"SET search_path TO {company.schema_name}"))
                
                # Check if s3_url exists, if not, add it
                # And drop content column
                try:
                    connection.execute(text(f"ALTER TABLE raw_uploads ADD COLUMN IF NOT EXISTS s3_url VARCHAR"))
                    connection.execute(text(f"ALTER TABLE raw_uploads DROP COLUMN IF EXISTS content"))
                    print(f"✅ Successfully migrated schema for {company.schema_name}")
                except Exception as inner_e:
                    print(f"⚠️ Error altering table for {company.schema_name}: {inner_e}")
                
                connection.commit()
    except Exception as e:
        print(f"Error migrating tables: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_schema()
