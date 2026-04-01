import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base

# ----------------------------
# ENUMS
# ----------------------------


class CompanyStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class HRStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class UserRole(str, enum.Enum):
    admin = "admin"
    company = "company"
    hr = "hr"


# ----------------------------
# COMPANY TABLE (PUBLIC SCHEMA)
# ----------------------------


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, nullable=False)
    company_email = Column(String, unique=True, index=True, nullable=False)
    schema_name = Column(String, unique=True, nullable=False)
    status = Column(Enum(CompanyStatus), default=CompanyStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    # hr_accounts moved to tenant schema


# ----------------------------
# GLOBAL USERS TABLE (PUBLIC SCHEMA)
# ----------------------------


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole))
    schema_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    refresh_tokens = relationship("RefreshToken", back_populates="user")


# HR ACCOUNTS moved to tenant schema (app/auth/tenant_models.py)


# ----------------------------
# REFRESH TOKENS (PUBLIC SCHEMA)
# ----------------------------


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("public.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="refresh_tokens")
