import logging
import random
import time
import secrets
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.auth import (
    UserRegister, UserLogin, TokenResponse, UserResponse, PasswordChange,
    SocialLoginRequest, MagicCodeSendRequest, MagicCodeResponse, MagicCodeVerifyRequest, DemoLoginRequest
)
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.core.deps import get_current_active_user
from app.core.rate_limiter import limiter
from app.config import ACCESS_TOKEN_EXPIRE_MINUTES, RATE_LIMIT_LOGIN, RATE_LIMIT_REGISTER

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# In-memory store for magic one-time access codes: {email: {"code": str, "expires_at": float}}
MAGIC_CODES = {}


@router.post("/register", response_model=TokenResponse)
@limiter.limit(RATE_LIMIT_REGISTER)
def register_user(
    request: Request,
    user_in: UserRegister,
    db: Session = Depends(get_db)
):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # First user can automatically be admin if needed, or default to regular user
    user_count = db.query(User).count()
    role = "admin" if user_count == 0 else "user"

    new_user = User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or user_in.email.split("@")[0].capitalize(),
        role=role,
        is_active=True,
        tier="free",
        max_duration_seconds=600  # 10 min for free tier
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log registration
    audit = AuditLog(
        target_user_id=new_user.id,
        action="user_registered",
        resource_type="user",
        resource_id=new_user.id,
        ip_address=request.client.host if request.client else None
    )
    db.add(audit)
    db.commit()

    access_token = create_access_token(new_user.id, role=new_user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": new_user
    }

@router.post("/login", response_model=TokenResponse)
@limiter.limit(RATE_LIMIT_LOGIN)
def login_user(
    request: Request,
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended. Please contact platform support."
        )

    access_token = create_access_token(user.id, role=user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.post("/change-password")
def change_password(
    pwd_in: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if not verify_password(pwd_in.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password incorrect")

    current_user.hashed_password = get_password_hash(pwd_in.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.post("/social-login", response_model=TokenResponse)
def social_login(
    payload: SocialLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Sign in or sign up seamlessly with third-party providers (Google, GitHub, Microsoft).
    """
    clean_email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user:
        # Create new user for this social identity
        user_count = db.query(User).count()
        role = "admin" if user_count == 0 else "user"
        random_pwd = secrets.token_urlsafe(32)

        user = User(
            email=clean_email,
            hashed_password=get_password_hash(random_pwd),
            full_name=payload.full_name or clean_email.split("@")[0].capitalize(),
            role=role,
            is_active=True,
            tier="free",
            max_duration_seconds=600
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Log audit
        audit = AuditLog(
            target_user_id=user.id,
            action=f"social_login_created_{payload.provider}",
            resource_type="user",
            resource_id=user.id,
            ip_address=request.client.host if request.client else None
        )
        db.add(audit)
        db.commit()
    else:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated. Please contact support."
            )

    access_token = create_access_token(user.id, role=user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }

@router.post("/magic-code/send", response_model=MagicCodeResponse)
def send_magic_code(payload: MagicCodeSendRequest):
    """
    Generate and dispatch a 6-digit magic passcode for passwordless authentication.
    """
    clean_email = payload.email.lower().strip()
    # Generate random 6 digit numeric OTP
    code = f"{random.randint(100000, 999999)}"
    # Store with 10 minute expiry
    MAGIC_CODES[clean_email] = {
        "code": code,
        "expires_at": time.time() + 600
    }
    logger.info(f"Generated magic code for {clean_email}: {code}")
    return {
        "message": f"6-digit security code generated for {clean_email}",
        "email": clean_email,
        "code": code
    }

@router.post("/magic-code/verify", response_model=TokenResponse)
def verify_magic_code(
    payload: MagicCodeVerifyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verify 6-digit passcode and authenticate the session.
    """
    clean_email = payload.email.lower().strip()
    record = MAGIC_CODES.get(clean_email)

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No passcode was requested for this email or it has expired. Please request a new code."
        )

    if time.time() > record["expires_at"]:
        del MAGIC_CODES[clean_email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passcode has expired. Please request a fresh one."
        )

    if payload.code.strip() != record["code"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid security code. Please check and try again."
        )

    # Validated: remove code to prevent reuse
    del MAGIC_CODES[clean_email]

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        user_count = db.query(User).count()
        role = "admin" if user_count == 0 else "user"
        random_pwd = secrets.token_urlsafe(32)

        user = User(
            email=clean_email,
            hashed_password=get_password_hash(random_pwd),
            full_name=clean_email.split("@")[0].capitalize(),
            role=role,
            is_active=True,
            tier="free",
            max_duration_seconds=600
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended."
        )

    access_token = create_access_token(user.id, role=user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }

@router.post("/demo-login", response_model=TokenResponse)
def demo_login(
    payload: DemoLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Instant 1-click login for evaluating the platform as a Creator or Admin.
    """
    if payload.role == "admin":
        email = "admin@subtitlegenerator.com"
        full_name = "Platform Administrator"
        role = "admin"
        tier = "unlimited"
        quota = 360000
    else:
        email = "demo.creator@subtitlegenerator.com"
        full_name = "Alex Creator (Demo)"
        role = "user"
        tier = "pro"
        quota = 3600

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            hashed_password=get_password_hash("DemoSecretPass123!"),
            full_name=full_name,
            role=role,
            is_active=True,
            tier=tier,
            max_duration_seconds=quota
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.is_active:
        user.is_active = True
        db.commit()

    access_token = create_access_token(user.id, role=user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }

