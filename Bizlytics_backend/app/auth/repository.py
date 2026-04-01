from __future__ import annotations

import hashlib
from datetime import datetime

from sqlalchemy.orm import Session

from app.auth.models import Company, CompanyStatus, RefreshToken, User, UserRole
from app.auth.tenant_models import HRAccount, HRStatus

# ============================================
# Company Operations
# ============================================


def get_company_by_email(db: Session, email: str) -> Company | None:
    return db.query(Company).filter(Company.company_email == email).first()


def create_company(
    db: Session, company_name: str, company_email: str, schema_name: str
) -> Company:
    company = Company(
        company_name=company_name,
        company_email=company_email,
        schema_name=schema_name,
        status=CompanyStatus.pending,
    )
    db.add(company)
    return company


# ============================================
# User Operations
# ============================================


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    email: str,
    password_hash: str,
    role: UserRole,
    schema_name: str | None = None,
) -> User:
    user = User(
        email=email, password_hash=password_hash, role=role, schema_name=schema_name,
    )
    db.add(user)
    return user


# ============================================
# HR Account Operations
# ============================================


def create_hr_account(db: Session, email: str, password_hash: str) -> HRAccount:
    hr = HRAccount(email=email, password_hash=password_hash, status=HRStatus.pending)
    db.add(hr)
    return hr


# ============================================
# Refresh Token Operations
# ============================================


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def save_refresh_token(
    db: Session, user_id: int, raw_token: str, expires_at: datetime
) -> RefreshToken:
    token_record = RefreshToken(
        user_id=user_id,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
        revoked=False,
    )
    db.add(token_record)
    db.commit()
    db.refresh(token_record)
    return token_record


def get_refresh_token(db: Session, raw_token: str) -> RefreshToken | None:
    return (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == _hash_token(raw_token))
        .first()
    )


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    token_record = get_refresh_token(db, raw_token)
    if token_record:
        token_record.revoked = True
        db.commit()


def revoke_all_user_tokens(db: Session, user_id: int) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id, not RefreshToken.revoked,
    ).update({"revoked": True})

    db.commit()
