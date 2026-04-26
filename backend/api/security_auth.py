"""
Secure Auth Router for the Admin Portal.
Implements:
- POST /register — multi-step user registration
- POST /login — user login with JWT
- POST /admin/login — admin login with TOTP 2FA
- POST /refresh — token refresh with rotation
- POST /logout — invalidate tokens
- GET /me — current user profile
- POST /change-password
"""
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
import hashlib

from .security_models import (
    UserRegisterFull, UserLoginRequest, AdminLoginRequest,
    PasswordChangeRequest, UserProfileUpdate
)
from .security_utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    verify_jwt, verify_totp,
    set_auth_cookies, clear_auth_cookies,
    generate_csrf_token
)
from .security_db import (
    find_portal_user_by_email, create_portal_user, update_portal_user,
    create_session, find_session_by_token_hash, revoke_session, revoke_user_sessions,
    log_login_event, get_user_kyc_status,
    get_user_notifications, log_audit
)

router = APIRouter()

MAX_LOGIN_ATTEMPTS = 5
CAPTCHA_THRESHOLD = 3


def _get_client_info(request: Request):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    return ip, ua


def _get_current_user(request: Request) -> dict:
    """Extract user from access token cookie or Authorization header."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_jwt(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = find_portal_user_by_email(payload["email"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("status") == "blocked":
        raise HTTPException(status_code=403, detail="Account is blocked")
    return user


@router.post("/register")
async def register(body: UserRegisterFull, request: Request):
    """User registration with validation."""
    if body.password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing = find_portal_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    pwd_hash = hash_password(body.password)
    new_user = create_portal_user(
        name=body.name,
        email=body.email,
        dob=str(body.dob),
        password_hash=pwd_hash,
    )

    ip, ua = _get_client_info(request)
    log_audit("system", "user_registered", "user", new_user["id"], ip_address=ip, user_agent=ua)

    return {
        "status": "success",
        "message": "Registration successful. Please complete KYC verification.",
        "user": {
            "id": new_user["id"],
            "email": new_user["email"],
            "name": new_user["name"],
            "role": new_user["role"],
            "status": new_user["status"],
        }
    }


@router.post("/login")
async def login(body: UserLoginRequest, request: Request, response: Response):
    """User login with JWT in httpOnly cookies."""
    ip, ua = _get_client_info(request)
    user = find_portal_user_by_email(body.email)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Check if blocked
    if user.get("status") == "blocked":
        log_login_event(user["id"], False, ip, ua, failure_reason="account_blocked")
        raise HTTPException(status_code=403, detail="Account is locked. Contact support.")

    # Verify password
    if not verify_password(body.password, user["password_hash"]):
        failures = user.get("failed_login_attempts", 0) + 1
        update_portal_user(user["id"], {"failed_login_attempts": failures})
        log_login_event(user["id"], False, ip, ua, failure_reason="invalid_password")

        if failures >= MAX_LOGIN_ATTEMPTS:
            update_portal_user(user["id"], {"status": "blocked"})
            log_audit("system", "account_locked", "user", user["id"], ip_address=ip)
            raise HTTPException(status_code=403, detail="Account locked after multiple failed attempts")

        remaining = MAX_LOGIN_ATTEMPTS - failures
        detail = f"Invalid credentials. {remaining} attempts remaining."
        if failures >= CAPTCHA_THRESHOLD:
            detail += " CAPTCHA required."
        raise HTTPException(status_code=401, detail=detail)

    # Reset failed attempts
    update_portal_user(user["id"], {"failed_login_attempts": 0})

    # Create tokens
    access_token = create_access_token(user["id"], user["email"], user["role"])
    refresh_token, refresh_hash = create_refresh_token(user["id"])
    create_session(user["id"], refresh_hash, ip, ua)

    log_login_event(user["id"], True, ip, ua)
    set_auth_cookies(response, access_token, refresh_token)

    csrf_token = generate_csrf_token()

    return {
        "status": "success",
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name", ""),
            "role": user["role"],
            "status": user["status"],
            "dob": user.get("dob"),
            "created_at": user.get("created_at"),
        },
        "csrf_token": csrf_token,
        "access_token": access_token,
        "requires_captcha": user.get("failed_login_attempts", 0) >= CAPTCHA_THRESHOLD,
    }


@router.post("/admin/login")
async def admin_login(body: AdminLoginRequest, request: Request, response: Response):
    """Admin login with TOTP 2FA."""
    ip, ua = _get_client_info(request)
    user = find_portal_user_by_email(body.email)

    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    if user.get("status") == "blocked":
        log_login_event(user["id"], False, ip, ua, failure_reason="admin_account_blocked")
        raise HTTPException(status_code=403, detail="Admin account is locked")

    if not verify_password(body.password, user["password_hash"]):
        failures = user.get("failed_login_attempts", 0) + 1
        update_portal_user(user["id"], {"failed_login_attempts": failures})
        log_login_event(user["id"], False, ip, ua, failure_reason="invalid_password")

        if failures >= MAX_LOGIN_ATTEMPTS:
            update_portal_user(user["id"], {"status": "blocked"})
            log_audit("system", "admin_account_locked", "user", user["id"], ip_address=ip)
            raise HTTPException(status_code=403, detail="Admin account locked. Contact security team.")

        needs_captcha = failures >= CAPTCHA_THRESHOLD
        return JSONResponse(status_code=200, content={
            "status": "error",
            "detail": f"Invalid credentials. {MAX_LOGIN_ATTEMPTS - failures} attempts remaining.",
            "requires_captcha": needs_captcha,
            "failed_attempts": failures,
        })

    # Verify TOTP
    if not verify_totp(body.totp_code):
        log_login_event(user["id"], False, ip, ua, failure_reason="invalid_totp")
        return JSONResponse(status_code=200, content={
            "status": "error",
            "detail": "Invalid 2FA code. Please check your authenticator app.",
            "requires_captcha": False,
            "failed_attempts": user.get("failed_login_attempts", 0),
        })

    # Reset failed attempts
    update_portal_user(user["id"], {"failed_login_attempts": 0})

    access_token = create_access_token(user["id"], user["email"], "admin")
    refresh_token, refresh_hash = create_refresh_token(user["id"])
    create_session(user["id"], refresh_hash, ip, ua)
    log_login_event(user["id"], True, ip, ua)
    log_audit(user["id"], "admin_login", "session", user["id"], ip_address=ip, user_agent=ua)
    set_auth_cookies(response, access_token, refresh_token)

    return {
        "status": "success",
        "message": "Admin login successful",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name", "System Admin"),
            "role": "admin",
        },
        "csrf_token": generate_csrf_token(),
        "access_token": access_token,
    }


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    """Refresh access token using refresh token rotation."""
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    payload = verify_jwt(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    session = find_session_by_token_hash(token_hash)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found or revoked")

    # Revoke old session
    revoke_session(session["id"])

    user = find_portal_user_by_email(payload.get("email", ""))
    if not user:
        # Find by ID
        from .security_db import get_portal_user_by_id
        user_data = get_portal_user_by_id(payload["sub"])
        if not user_data:
            raise HTTPException(status_code=401, detail="User not found")
        user = find_portal_user_by_email(user_data.get("email", ""))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

    # Create new tokens (rotation)
    ip, ua = _get_client_info(request)
    new_access = create_access_token(user["id"], user["email"], user["role"])
    new_refresh, new_hash = create_refresh_token(user["id"])
    create_session(user["id"], new_hash, ip, ua)
    set_auth_cookies(response, new_access, new_refresh)

    return {
        "status": "success",
        "access_token": new_access,
        "expires_in": 900,
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Invalidate tokens and clear cookies."""
    try:
        user = _get_current_user(request)
        ip, ua = _get_client_info(request)
        revoke_user_sessions(user["id"])
        log_audit(user["id"], "logout", "session", user["id"], ip_address=ip)
    except Exception:
        pass

    clear_auth_cookies(response)
    return {"status": "success", "message": "Logged out"}


@router.get("/me")
async def get_me(request: Request):
    """Get current user profile."""
    user = _get_current_user(request)
    kyc = get_user_kyc_status(user["id"])
    notifications = get_user_notifications(user["id"])
    unread = len([n for n in notifications if not n.get("read")])

    return {
        "status": "success",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name", ""),
            "role": user["role"],
            "status": user["status"],
            "dob": user.get("dob"),
            "kyc_status": kyc["status"],
            "created_at": user.get("created_at"),
        },
        "unread_notifications": unread,
    }


@router.post("/change-password")
async def change_password(body: PasswordChangeRequest, request: Request):
    """Change user password."""
    user = _get_current_user(request)

    if not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    new_hash = hash_password(body.new_password)
    update_portal_user(user["id"], {"password_hash": new_hash})

    ip, ua = _get_client_info(request)
    log_audit(user["id"], "password_changed", "user", user["id"], ip_address=ip)

    return {"status": "success", "message": "Password changed successfully"}


@router.patch("/update-profile")
async def update_profile(body: UserProfileUpdate, request: Request):
    """Update user profile."""
    user = _get_current_user(request)
    
    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.dob is not None:
        updates["dob"] = str(body.dob)
        
    if updates:
        update_portal_user(user["id"], updates)
        ip, ua = _get_client_info(request)
        log_audit(user["id"], "profile_updated", "user", user["id"], ip_address=ip)
        
    return {"status": "success", "message": "Profile updated successfully"}
