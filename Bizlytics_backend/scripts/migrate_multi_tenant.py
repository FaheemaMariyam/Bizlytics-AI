import os
import sys

# Ensure we can import from app
sys.path.append(os.getcwd())

from sqlalchemy import text

from app.auth.models import Company
from app.database import SessionLocal, engine


def migrate():
    db = SessionLocal()
    try:
        companies = db.query(Company).all()
        for company in companies:
            schema = company.schema_name
            print(f">>> Migrating schema: {schema}")

            with engine.connect() as conn:
                # 1. Update raw_uploads (S3 integration)
                try:
                    conn.execute(
                        text(
                            f"ALTER TABLE {schema}.raw_uploads ADD COLUMN IF NOT EXISTS s3_url VARCHAR"
                        )
                    )
                    conn.execute(
                        text(
                            f"ALTER TABLE {schema}.raw_uploads DROP COLUMN IF EXISTS content"
                        )
                    )
                    conn.execute(
                        text(
                            f"ALTER TABLE {schema}.raw_uploads DROP COLUMN IF EXISTS company_id"
                        )
                    )
                    print(
                        f"  [raw_uploads] - SUCCESS (Added s3_url, dropped content/company_id)"
                    )
                except Exception as e:
                    print(f"  [raw_uploads] - SKIP/ERROR: {str(e)}")

                # 2. Update hr_accounts (Cleanup redundant company_id)
                try:
                    conn.execute(
                        text(
                            f"ALTER TABLE {schema}.hr_accounts DROP COLUMN IF EXISTS company_id"
                        )
                    )
                    print(f"  [hr_accounts] - SUCCESS (Dropped company_id)")
                except Exception as e:
                    print(f"  [hr_accounts] - SKIP/ERROR: {str(e)}")

                conn.commit()

        print("\nMigration complete for all tenants.")
    except Exception as e:
        print(f"Migration failed: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
