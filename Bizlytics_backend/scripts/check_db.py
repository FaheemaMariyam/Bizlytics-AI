import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text

from app.database import engine


def check_db():
    with engine.connect() as conn:
        res = conn.execute(
            text(
                "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')"
            )
        )
        for row in res:
            print(f"Schema: {row[0]}, Table: {row[1]}")


if __name__ == "__main__":
    check_db()
