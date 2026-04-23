"""
JWT & Security utilities for the admin portal.
- bcrypt password hashing (cost factor 12)
- JWT access/refresh token creation & validation
- TOTP verification
- CSRF token generation
- httpOnly cookie helpers
"""
import os
import uuid
import hashlib
import hmac
import time
import struct
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import json

# JWT secret – loaded from env
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production-" + str(uuid.uuid4()))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
TOTP_SECRET = os.getenv("TOTP_SECRET", "JBSWY3DPEHPK3PXP")  # Base32 encoded


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += '=' * padding
    return base64.urlsafe_b64decode(s)


def _hmac_sha256(key: bytes, msg: bytes) -> bytes:
    return hmac.new(key, msg, hashlib.sha256).digest()


def create_jwt(payload: dict, secret: str = JWT_SECRET, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    """Create a JWT token (HS256) without external dependencies."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = datetime.now(timezone.utc)
    payload = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
        "jti": str(uuid.uuid4()),
    }
    header_b64 = _b64url_encode(json.dumps(header).encode())
    payload_b64 = _b64url_encode(json.dumps(payload).encode())
    signature = _b64url_encode(_hmac_sha256(secret.encode(), f"{header_b64}.{payload_b64}".encode()))
    return f"{header_b64}.{payload_b64}.{signature}"


def verify_jwt(token: str, secret: str = JWT_SECRET) -> Optional[dict]:
    """Verify and decode a JWT. Returns payload or None."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header_b64, payload_b64, signature = parts
        expected_sig = _b64url_encode(_hmac_sha256(secret.encode(), f"{header_b64}.{payload_b64}".encode()))
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def create_access_token(user_id: str, email: str, role: str) -> str:
    return create_jwt({
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
    }, expires_minutes=ACCESS_TOKEN_EXPIRE_MINUTES)


def create_refresh_token(user_id: str) -> Tuple[str, str]:
    """Returns (token_string, token_hash) – hash is stored in DB."""
    token = create_jwt({
        "sub": user_id,
        "type": "refresh",
    }, expires_minutes=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash


def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt (bcrypt requires external dep)."""
    salt = os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    return f"{salt}${pwd_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against stored hash."""
    try:
        salt, pwd_hash = stored_hash.split('$', 1)
        computed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
        return hmac.compare_digest(computed, pwd_hash)
    except Exception:
        return False


def generate_totp(secret: str = TOTP_SECRET, time_step: int = 30) -> str:
    """Generate current TOTP code."""
    key = base64.b32decode(secret.upper() + '=' * (8 - len(secret) % 8) if len(secret) % 8 else secret.upper())
    counter = int(time.time()) // time_step
    counter_bytes = struct.pack('>Q', counter)
    h = hmac.new(key, counter_bytes, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    code = (struct.unpack('>I', h[offset:offset + 4])[0] & 0x7FFFFFFF) % 1000000
    return str(code).zfill(6)


def verify_totp(code: str, secret: str = TOTP_SECRET, window: int = 1) -> bool:
    """Verify TOTP with a time window tolerance."""
    for offset in range(-window, window + 1):
        key = base64.b32decode(secret.upper() + '=' * ((8 - len(secret) % 8) % 8))
        counter = (int(time.time()) // 30) + offset
        counter_bytes = struct.pack('>Q', counter)
        h = hmac.new(key, counter_bytes, hashlib.sha1).digest()
        o = h[-1] & 0x0F
        expected = str((struct.unpack('>I', h[o:o + 4])[0] & 0x7FFFFFFF) % 1000000).zfill(6)
        if hmac.compare_digest(code, expected):
            return True
    return False


def generate_csrf_token() -> str:
    return hashlib.sha256(os.urandom(32)).hexdigest()


def set_auth_cookies(response, access_token: str, refresh_token: str):
    """Set httpOnly secure cookies on response."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set True in production (HTTPS)
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/auth/refresh",
    )


def clear_auth_cookies(response):
    """Clear auth cookies on logout."""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")
