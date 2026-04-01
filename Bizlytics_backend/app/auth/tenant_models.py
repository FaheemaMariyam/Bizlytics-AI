import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Integer, String

from app.tenant.models import TenantBase


class HRStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class HRAccount(TenantBase):
    __tablename__ = "hr_accounts"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    status = Column(Enum(HRStatus), default=HRStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)
