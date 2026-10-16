from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    tier: str
    max_duration_seconds: int
    monthly_transcribed_seconds: int
    created_at: datetime

    class Config:
        from_attributes = True

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class UserAdminUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    tier: Optional[str] = None
    max_duration_seconds: Optional[int] = None

class SocialLoginRequest(BaseModel):
    provider: str  # "google", "github", "microsoft", "apple"
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class MagicCodeSendRequest(BaseModel):
    email: EmailStr

class MagicCodeResponse(BaseModel):
    message: str
    email: str
    code: Optional[str] = None

class MagicCodeVerifyRequest(BaseModel):
    email: EmailStr
    code: str

class DemoLoginRequest(BaseModel):
    role: str = "user"  # "user" or "admin"

