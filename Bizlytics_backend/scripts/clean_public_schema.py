import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text

from app.database import engine


def clean_public_schema():
    try:
        with engine.connect() as connection:
            print("Dropping 'employees' table from public schema...")
            connection.execute(text("DROP TABLE IF EXISTS public.employees CASCADE;"))
            connection.commit()
            print("Successfully cleaned public schema!")
    except Exception as e:
        print(f"Error dropping table: {e}")


if __name__ == "__main__":
    clean_public_schema()
