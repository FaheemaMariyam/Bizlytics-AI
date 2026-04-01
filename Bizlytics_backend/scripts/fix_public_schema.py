import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from sqlalchemy import text

def run():
    with engine.connect() as connection:
        try:
            connection.execute(text("SET search_path TO public"))
            connection.execute(text("ALTER TABLE raw_uploads ADD COLUMN IF NOT EXISTS s3_url VARCHAR"))
            connection.execute(text("ALTER TABLE raw_uploads DROP COLUMN IF EXISTS content"))
            connection.commit()
            print("Successfully updated public.raw_uploads!")
        except Exception as e:
            print(f"Error: {e}")

run()
