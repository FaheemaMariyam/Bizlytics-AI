import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.auth.schemas import CompanyRegisterRequest
from app.auth.service import register_company
from app.database import SessionLocal, engine


def test_registration():
    db = SessionLocal()
    data = CompanyRegisterRequest(
        company_name="Test Company",
        company_email="test.company@bizlytics.com",
        password="Password123",
    )
    res = register_company(db, data)
    print("Registration response:", res)

    # Check if tables were created
    with engine.connect() as conn:
        from sqlalchemy import text

        tables = conn.execute(
            text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'company_test_company'"
            )
        ).fetchall()
        print("Tables in new schema:", [t[0] for t in tables])


if __name__ == "__main__":
    test_registration()
