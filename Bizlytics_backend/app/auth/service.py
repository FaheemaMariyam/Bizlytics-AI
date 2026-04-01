import logging
import re
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth import repository as repo
from app.auth.models import Company, CompanyStatus, User, UserRole
from app.auth.schemas import (
    ChangePasswordRequest,
    CompanyRegisterRequest,
    ForgotPasswordRequest,
    HRRegisterRequest,
    LoginRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.auth.tenant_models import HRAccount, HRStatus
from app.core.config import FRONTEND_URL, REFRESH_TOKEN_EXPIRE_DAYS
from app.core.emails import send_email
from app.core.jwt_handler import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
)
from app.core.security import hash_password, verify_password
from app.core.tenant import create_tenant_schema

logger = logging.getLogger(__name__)


# ============================================
# HR Registration (pending company approval)
# ============================================


# =========================================================================
# SAAS HR REGISTRATION (Sub-User Creation)
# =========================================================================
def register_hr(db: Session, data: HRRegisterRequest) -> MessageResponse:
    """
    1. SCOPING: Look up which company (tenant) this HR wants to join.
    2. AUTH: Create a global login record in 'public.users'.
    3. TENANT STORAGE: Switch database scope to the company's private schema
       and create the detailed HR profile inside it.
    """
    data.email = data.email.lower().strip()
    data.company_email = data.company_email.lower().strip()

    existing_user = repo.get_user_by_email(db, data.email)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    # Security: Ensure the target company exists and is approved
    company = repo.get_company_by_email(db, data.company_email)
    if not company:
        raise HTTPException(
            status_code=404, detail="Company not found with this email."
        )

    if company.status != CompanyStatus.approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This company is not yet approved. Please contact the company admin.",
        )

    try:
        hashed = hash_password(data.password)

        # CREATE GLOBAL ACCOUNT (For Login)
        repo.create_user(
            db=db,
            email=data.email,
            password_hash=hashed,
            role=UserRole.hr,
            schema_name=company.schema_name,  # Critical: Link user to their company's schema
        )

        # CREATE TENANT-SPECIFIC ACCOUNT (Inside the company room)
        # Note: We physically switch the Postgres scope to the company's schema here.
        from sqlalchemy import text

        db.execute(text(f"SET search_path TO {company.schema_name}, public"))

        repo.create_hr_account(
            db=db, email=data.email, password_hash=hashed,
        )

        db.commit()
        return MessageResponse(
            message="Registration submitted! Your account is pending company approval."
        )

    except Exception as e:
        db.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists.",
            )
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


# ============================================
# Company HR Management (approve / reject)
# ============================================


def get_pending_hrs(db: Session, company_id: int) -> List[dict]:
    """Get all pending HR registrations for a company."""
    hrs = db.query(HRAccount).filter(HRAccount.status == HRStatus.pending).all()
    return [
        {
            "id": hr.id,
            "email": hr.email,
            "status": hr.status.value,
            "created_at": hr.created_at,
        }
        for hr in hrs
    ]


def approve_hr(db: Session, company_id: int, hr_id: int) -> MessageResponse:
    """Approve a pending HR registration."""
    # Note: Middleware has already switched to the correct tenant schema
    hr = db.query(HRAccount).filter(HRAccount.id == hr_id).first()

    if not hr:
        raise HTTPException(status_code=404, detail="HR account not found")

    if hr.status != HRStatus.pending:
        raise HTTPException(
            status_code=400, detail=f"HR account is already {hr.status.value}"
        )

    hr.status = HRStatus.approved
    db.commit()
    logger.info("HR %s approved by company %s", hr.email, company_id)
    return MessageResponse(
        message=f"HR '{hr.email}' has been approved. They can now login."
    )


def reject_hr(db: Session, company_id: int, hr_id: int) -> MessageResponse:
    """Reject a pending HR registration."""
    # Note: Middleware has already switched to the correct tenant schema
    hr = db.query(HRAccount).filter(HRAccount.id == hr_id).first()

    if not hr:
        raise HTTPException(status_code=404, detail="HR account not found")

    if hr.status != HRStatus.pending:
        raise HTTPException(
            status_code=400, detail=f"HR account is already {hr.status.value}"
        )

    hr.status = HRStatus.rejected
    db.commit()
    logger.info("HR %s rejected by company %s", hr.email, company_id)
    return MessageResponse(message=f"HR '{hr.email}' has been rejected.")


# ============================================
# Login
# ============================================


def login_user(db: Session, data: LoginRequest) -> TokenResponse:
    """
    Authenticate user and return access + refresh tokens.
    """
    data.email = data.email.lower().strip()
    user = repo.get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # If HR, check company approval status in their assigned schema
    if user.role == UserRole.hr:
        if user.schema_name:
            from sqlalchemy import text

            db.execute(text(f"SET search_path TO {user.schema_name}, public"))

            hr_account = (
                db.query(HRAccount).filter(HRAccount.email == user.email).first()
            )
            if hr_account:
                if hr_account.status == HRStatus.pending:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Your HR registration is pending company approval.",
                    )
                elif hr_account.status == HRStatus.rejected:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Your HR registration was rejected by the company.",
                    )

            # Reset search_path to public for safety (though session usually ends)
            db.execute(text("SET search_path TO public"))

    # If Company, check if approved by Admin
    if user.role == UserRole.company:
        from app.auth.models import CompanyStatus

        company = db.query(Company).filter(Company.company_email == user.email).first()
        if company:
            if company.status == CompanyStatus.pending:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your company registration is pending admin approval.",
                )
            elif company.status == CompanyStatus.rejected:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your company registration was rejected.",
                )

    # Generate tokens
    token_data = {
        "user_id": user.id,
        "role": user.role.value,
        "schema_name": user.schema_name,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    refresh_expires = datetime.now(timezone.utc) + timedelta(
        days=REFRESH_TOKEN_EXPIRE_DAYS
    )
    repo.save_refresh_token(
        db=db, user_id=user.id, raw_token=refresh_token, expires_at=refresh_expires
    )

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# ============================================
# Refresh Tokens
# ============================================


def refresh_tokens(db: Session, data: RefreshTokenRequest) -> TokenResponse:
    """Issue new token pair using a valid refresh token."""
    payload = decode_token(data.refresh_token)
    if payload.get("token_type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Expected refresh token.",
        )

    token_record = repo.get_refresh_token(db, data.refresh_token)
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found",
        )

    if token_record.revoked:
        repo.revoke_all_user_tokens(db, token_record.user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked. All sessions terminated.",
        )

    repo.revoke_refresh_token(db, data.refresh_token)

    token_data = {
        "user_id": payload["user_id"],
        "role": payload["role"],
        "schema_name": payload.get("schema_name"),
    }
    new_access = create_access_token(token_data)
    new_refresh = create_refresh_token(token_data)

    refresh_expires = datetime.now(timezone.utc) + timedelta(
        days=REFRESH_TOKEN_EXPIRE_DAYS
    )
    repo.save_refresh_token(
        db=db,
        user_id=payload["user_id"],
        raw_token=new_refresh,
        expires_at=refresh_expires,
    )

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


# ============================================
# Logout
# ============================================


def logout_user(db: Session, user_id: int) -> MessageResponse:
    """Logout by revoking all refresh tokens for the user."""
    repo.revoke_all_user_tokens(db, user_id)
    return MessageResponse(message="Logged out successfully")


# ============================================
# Company Registration
# ============================================


# =========================================================================
# SAAS COMPANY REGISTRATION (Tenant Creation)
# =========================================================================
def register_company(db: Session, data: CompanyRegisterRequest) -> MessageResponse:
    """
    1. VALIDATION: Ensure email is unique in the entire SaaS platform.
    2. SCHEMA GENERATION: Create a unique 'schema_name' based on the company name.
    3. INFRASTRUCTURE: Physically create the isolated PostgreSQL schema for this tenant.
    4. USER PROVISIONING: Create the first 'Company Admin' user.
    """
    data.company_email = data.company_email.lower().strip()

    existing = repo.get_company_by_email(db, data.company_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company with this email already exists",
        )

    existing_user = repo.get_user_by_email(db, data.company_email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    # Convert "Apple Inc" to "company_apple_inc"
    schema_name = "company_" + re.sub(
        r"[^a-z0-9]+", "_", data.company_name.lower()
    ).strip("_")
    hashed = hash_password(data.password)

    try:
        # STEP 1: Save metadata to 'public.companies'
        repo.create_company(
            db=db,
            company_name=data.company_name,
            company_email=data.company_email,
            schema_name=schema_name,
        )

        # STEP 2: Create the user in 'public.users'
        repo.create_user(
            db=db,
            email=data.company_email,
            password_hash=hashed,
            role=UserRole.company,
            schema_name=schema_name,
        )

        # STEP 3: Create the real SQL Schema database (DDL)
        create_tenant_schema(db, schema_name)

        db.commit()
        return MessageResponse(
            message=f"Company '{data.company_name}' registered successfully. Status: pending approval."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


def forgot_password(db: Session, data: ForgotPasswordRequest) -> MessageResponse:

    user = repo.get_user_by_email(db, data.email)

    if not user:
        return MessageResponse(message="If the email exists, reset link sent.")

    token = create_password_reset_token({"user_id": user.id})

    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    send_email(
        to=user.email,
        subject="Password Reset",
        body=f"Click this link to reset password: {reset_link}",
    )

    return MessageResponse(message="Password reset link sent.")


def reset_password(db: Session, data: ResetPasswordRequest) -> MessageResponse:

    payload = decode_token(data.token)

    if payload.get("token_type") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid token")

    user = db.query(User).filter(User.id == payload["user_id"]).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(data.new_password)

    db.commit()

    return MessageResponse(message="Password reset successful")


def change_password(
    db: Session, user: User, data: ChangePasswordRequest
) -> MessageResponse:

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password incorrect")

    user.password_hash = hash_password(data.new_password)

    db.commit()

    return MessageResponse(message="Password updated successfully")
