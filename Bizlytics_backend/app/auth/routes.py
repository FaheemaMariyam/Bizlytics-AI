from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import service
from app.auth.dependencies import get_current_user
from app.auth.models import Company, User, UserRole
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
    UserResponse,
)
from app.database import get_db

router = APIRouter()


# ============================================
# Company Registration
# ============================================


@router.post("/company/register", response_model=MessageResponse, status_code=201)
def company_register(data: CompanyRegisterRequest, db: Session = Depends(get_db)):
    """Register a new company and create a new tenant schema."""
    return service.register_company(db, data)


# ============================================
# HR Registration
# ============================================


@router.post("/hr/register", response_model=MessageResponse, status_code=201)
def hr_register(data: HRRegisterRequest, db: Session = Depends(get_db)):
    """Register HR account (pending company approval)."""
    return service.register_hr(db, data)


# ============================================
# Company HR Management (approve / reject)
# ============================================


def require_company(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to enforce company role."""
    if current_user.role != UserRole.company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Requires company privileges",
        )
    return current_user


@router.get("/company/hr/pending")
def list_pending_hrs(
    db: Session = Depends(get_db), current_user: User = Depends(require_company),
):
    """List pending HR registrations for this company."""
    company = (
        db.query(Company).filter(Company.company_email == current_user.email).first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return service.get_pending_hrs(db, company.id)


@router.post("/company/hr/{hr_id}/approve", response_model=MessageResponse)
def approve_hr(
    hr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company),
):
    """Approve a pending HR registration."""
    company = (
        db.query(Company).filter(Company.company_email == current_user.email).first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return service.approve_hr(db, company.id, hr_id)


@router.post("/company/hr/{hr_id}/reject", response_model=MessageResponse)
def reject_hr(
    hr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_company),
):
    """Reject a pending HR registration."""
    company = (
        db.query(Company).filter(Company.company_email == current_user.email).first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return service.reject_hr(db, company.id, hr_id)


# ============================================
# Login, Refresh, Logout, Profile
# ============================================


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Login and get access + refresh tokens."""
    return service.login_user(db, data)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh tokens using a valid refresh token."""
    return service.refresh_tokens(db, data)


@router.post("/logout", response_model=MessageResponse)
def logout(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Logout — revokes all refresh tokens. Requires JWT."""
    return service.logout_user(db, current_user.id)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile. Requires JWT."""
    return current_user


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.change_password(db, current_user, data)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    return service.forgot_password(db, data)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    return service.reset_password(db, data)
