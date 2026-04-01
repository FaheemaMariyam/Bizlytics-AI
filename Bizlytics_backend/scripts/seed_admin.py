import os

import bcrypt

from app.auth.models import User, UserRole
from app.database import SessionLocal


def seed_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.role == UserRole.admin).first()
        if admin:
            print("Admin user already exists!")
            return

        print("Seeding initial admin user...")
        admin_email = os.getenv("ADMIN_EMAIL", "admin@bizlytics.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")

        # Hash directly to bypass passlib issue
        hashed_password = bcrypt.hashpw(
            admin_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        new_admin = User(
            email=admin_email,
            password_hash=hashed_password,
            role=UserRole.admin,
            schema_name="public",
        )

        db.add(new_admin)
        db.commit()
        print(f"Admin user created! (Email: {admin_email}, Password: {admin_password})")
    except Exception as e:
        print(f"Error seeding admin: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
