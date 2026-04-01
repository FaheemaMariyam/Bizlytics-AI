from sqlalchemy import text

from app.database import engine


def check():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT schema_name FROM companies")).fetchall()
        for row in res:
            schema = row[0]
            try:
                # Use a specific filename if known, or just the most recent
                last_file = conn.execute(
                    text(
                        f"SELECT filename, s3_url FROM {schema}.raw_uploads ORDER BY created_at DESC LIMIT 1"
                    )
                ).fetchone()
                if last_file:
                    print(f"[{schema}] File: {last_file[0]}, URL: {last_file[1]}")
            except:
                pass


if __name__ == "__main__":
    check()
