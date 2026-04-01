import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

import traceback

from app.auth.schemas import LoginRequest
from app.auth.service import login_user
from app.database import SessionLocal


def test_login(email, password):
    print(f"Testing login for {email}...")
    db = SessionLocal()
    try:
        data = LoginRequest(email=email, password=password)
        result = login_user(db, data)
        print(f"SUCCESS: {result}")
    except Exception as e:
        print(f"FAILED: {e}")
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    # Test with admin
    test_login("admin@bizlytics.com", "admin123")
