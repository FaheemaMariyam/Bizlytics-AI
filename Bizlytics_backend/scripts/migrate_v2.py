from sqlalchemy import text

from app.auth.models import Company
from app.database import SessionLocal, engine


def migrate():
    db = SessionLocal()
    try:
        companies = db.query(Company).all()
        for company in companies:
            schema = company.schema_name
            print(f"Updating schema: {schema}")
            try:
                with engine.connect() as conn:
                    # Add columns if they don't exist
                    conn.execute(
                        text(
                            f"ALTER TABLE {schema}.raw_uploads ADD COLUMN IF NOT EXISTS column_count INTEGER"
                        )
                    )
                    conn.execute(
                        text(
                            f"ALTER TABLE {schema}.raw_uploads ADD COLUMN IF NOT EXISTS columns_metadata TEXT"
                        )
                    )
                    conn.execute(
                        text(
                            f"ALTER TABLE {schema}.raw_uploads ADD COLUMN IF NOT EXISTS column_mapping TEXT"
                        )
                    )
                    conn.commit()
                print(f"Successfully updated {schema}")
            except Exception as e:
                print(f"Failed to update {schema}: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
