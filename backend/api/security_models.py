"""
Pydantic models for the security/admin portal.
Strict validation on all request bodies.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
from datetime import date
import re


# ── Auth Models ──────────────────────────────────────────────────────────────

class UserRegisterStep1(BaseModel):
    """Step 1: Personal info"""
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    dob: date

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()

    @field_validator('dob')
    @classmethod
    def validate_age(cls, v: date) -> date:
        from dateutil.relativedelta import relativedelta
        today = date.today()
        age = relativedelta(today, v).years
        if age < 18:
            raise ValueError('Must be at least 18 years old')
        return v

    model_config = {"extra": "forbid"}


class UserRegisterFull(BaseModel):
    """Full registration payload"""
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    dob: date
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    terms_accepted: bool = True

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v.lower()

    @field_validator('dob')
    @classmethod
    def validate_age(cls, v: date) -> date:
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 18:
            raise ValueError('Must be at least 18 years old')
        return v

    @field_validator('terms_accepted')
    @classmethod
    def must_accept_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError('Terms and conditions must be accepted')
        return v

    model_config = {"extra": "forbid"}


class UserLoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
    model_config = {"extra": "forbid"}


class AdminLoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
    totp_code: str = Field(..., min_length=6, max_length=6)
    model_config = {"extra": "forbid"}


class RefreshTokenRequest(BaseModel):
    pass  # Token comes from httpOnly cookie


# ── User Management Models ───────────────────────────────────────────────────

class UserStatusUpdate(BaseModel):
    status: Literal['active', 'suspended', 'blocked']
    reason: Optional[str] = None
    model_config = {"extra": "forbid"}


class BulkActionRequest(BaseModel):
    user_ids: List[str] = Field(..., min_length=1, max_length=100)
    action: Literal['suspend', 'block', 'activate', 'delete']
    reason: Optional[str] = None
    model_config = {"extra": "forbid"}


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    dob: Optional[date] = None
    model_config = {"extra": "forbid"}


# ── KYC Models ───────────────────────────────────────────────────────────────

class KYCReviewRequest(BaseModel):
    decision: Literal['approved', 'rejected', 'resubmit']
    rejection_reason: Optional[str] = None
    model_config = {"extra": "forbid"}

    @field_validator('rejection_reason')
    @classmethod
    def require_reason_on_reject(cls, v, info):
        if info.data.get('decision') == 'rejected' and not v:
            raise ValueError('Rejection reason is required')
        return v


# ── Phishing Models ──────────────────────────────────────────────────────────

class PhishingScanRequest(BaseModel):
    url: Optional[str] = None
    content: Optional[str] = None
    model_config = {"extra": "forbid"}

    @field_validator('content')
    @classmethod
    def require_url_or_content(cls, v, info):
        if not v and not info.data.get('url'):
            raise ValueError('Either URL or content must be provided')
        return v


class PhishingActionRequest(BaseModel):
    action: Literal['dismiss', 'escalate', 'block']
    notes: Optional[str] = None
    model_config = {"extra": "forbid"}


# ── Report Models ────────────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    report_type: Literal['users', 'kyc', 'phishing', 'activity', 'login_events']
    format: Literal['csv', 'pdf'] = 'csv'
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    model_config = {"extra": "forbid"}


# ── Password Change ─────────────────────────────────────────────────────────

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    model_config = {"extra": "forbid"}
