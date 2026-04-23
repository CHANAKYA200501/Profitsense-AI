"""
Admin Portal API Router.
All endpoints require admin authentication.
Implements:
- User management (CRUD, bulk actions, status updates)
- KYC review
- Phishing alerts management
- Audit/activity logs
- Dashboard stats
- Report generation
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from typing import Optional
import csv
import io
import os
import uuid
from datetime import datetime

from .security_models import (
    UserStatusUpdate, BulkActionRequest,
    KYCReviewRequest, PhishingScanRequest, PhishingActionRequest
)
from .security_utils import verify_jwt
from .security_db import (
    get_portal_users, get_portal_user_by_id, update_portal_user, soft_delete_user,
    get_pending_kyc, review_kyc, create_kyc_submission,
    get_phishing_threats, get_phishing_stats, update_phishing_threat, create_phishing_threat,
    get_audit_logs, log_audit,
    get_dashboard_stats, get_user_kyc_status,
    create_notification, get_user_notifications,
    _load,
)

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "kyc_uploads")


def _require_admin(request: Request) -> dict:
    """Verify admin role from token."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


def _get_client_info(request: Request):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "unknown")
    return ip, ua


# ── DASHBOARD ────────────────────────────────────────────────────────────────

@router.get("/dashboard/stats")
async def dashboard_stats(request: Request):
    _require_admin(request)
    stats = get_dashboard_stats()
    return {"status": "success", "stats": stats}


@router.get("/dashboard/activity")
async def dashboard_activity(request: Request, limit: int = Query(50, le=200)):
    _require_admin(request)
    logs = get_audit_logs(per_page=limit)
    return {"status": "success", "activity": logs["logs"]}


# ── USER MANAGEMENT ─────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    kyc_status: Optional[str] = None,
    search: Optional[str] = None,
):
    _require_admin(request)
    result = get_portal_users(page, per_page, status, kyc_status, search)
    return {"status": "success", **result}


@router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    _require_admin(request)
    user = get_portal_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "user": user}


@router.patch("/users/{user_id}/status")
async def update_user_status(user_id: str, body: UserStatusUpdate, request: Request):
    admin = _require_admin(request)
    ip, ua = _get_client_info(request)

    user = get_portal_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    before = {"status": user.get("status")}
    updated = update_portal_user(user_id, {"status": body.status})
    after = {"status": body.status}

    log_audit(admin["sub"], f"user_{body.status}", "user", user_id,
              before_state=before, after_state=after, ip_address=ip, user_agent=ua)

    create_notification(user_id, "account", "Account Status Updated",
                       f"Your account status has been changed to {body.status}.")

    return {"status": "success", "message": f"User status updated to {body.status}"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    admin = _require_admin(request)
    ip, ua = _get_client_info(request)

    user = get_portal_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete admin accounts")

    success = soft_delete_user(user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete user")

    log_audit(admin["sub"], "user_deleted", "user", user_id,
              before_state={"email": user.get("email")}, ip_address=ip, user_agent=ua)

    return {"status": "success", "message": "User soft-deleted and PII anonymized"}


@router.get("/users/{user_id}/activity")
async def get_user_activity(user_id: str, request: Request, page: int = Query(1, ge=1)):
    _require_admin(request)
    logs = get_audit_logs(page=page, per_page=20)
    user_logs = [l for l in logs["logs"] if l.get("target_id") == user_id]
    return {"status": "success", "activity": user_logs}


@router.post("/users/bulk-action")
async def bulk_action(body: BulkActionRequest, request: Request):
    admin = _require_admin(request)
    ip, ua = _get_client_info(request)

    results = {"success": 0, "failed": 0, "errors": []}

    for uid in body.user_ids:
        try:
            user = get_portal_user_by_id(uid)
            if not user:
                results["failed"] += 1
                results["errors"].append(f"User {uid} not found")
                continue

            if user.get("role") == "admin":
                results["failed"] += 1
                results["errors"].append(f"Cannot modify admin {uid}")
                continue

            if body.action == "delete":
                soft_delete_user(uid)
            else:
                status_map = {"suspend": "suspended", "block": "blocked", "activate": "active"}
                new_status = status_map.get(body.action, body.action)
                update_portal_user(uid, {"status": new_status})

            log_audit(admin["sub"], f"bulk_{body.action}", "user", uid,
                      ip_address=ip, user_agent=ua)
            results["success"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"Error on {uid}: {str(e)}")

    return {"status": "success", "results": results}


# ── KYC ──────────────────────────────────────────────────────────────────────

@router.post("/kyc/submit")
async def submit_kyc(
    request: Request,
    document_type: str = Form(...),
    full_name: str = Form(...),
    document_number: str = Form(""),
    file: UploadFile = File(...),
):
    """KYC submission endpoint (user-facing)."""
    # Get user from token
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Validate file
    allowed_types = ["image/jpeg", "image/png", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File must be JPG, PNG, or PDF")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File must be under 5MB")

    # Save file
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_ext = file.filename.split(".")[-1] if file.filename else "bin"
    file_key = f"kyc_{payload['sub']}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_key)
    with open(file_path, "wb") as f:
        f.write(content)

    submission = create_kyc_submission(
        user_id=payload["sub"],
        document_type=document_type,
        file_key=file_key,
        personal_info={"full_name": full_name, "document_number": document_number},
    )

    return {"status": "success", "message": "KYC submitted for review", "submission_id": submission["id"]}


@router.get("/kyc/pending")
async def list_pending_kyc(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    _require_admin(request)
    result = get_pending_kyc(page, per_page)
    return {"status": "success", **result}


@router.patch("/kyc/{submission_id}/review")
async def review_kyc_submission(submission_id: str, body: KYCReviewRequest, request: Request):
    admin = _require_admin(request)
    ip, ua = _get_client_info(request)

    result = review_kyc(submission_id, body.decision, admin["sub"], body.rejection_reason)
    if not result:
        raise HTTPException(status_code=404, detail="KYC submission not found")

    log_audit(admin["sub"], f"kyc_{body.decision}", "kyc", submission_id,
              after_state={"decision": body.decision, "reason": body.rejection_reason},
              ip_address=ip, user_agent=ua)

    # Notify user
    msg = {
        "approved": "Your identity has been verified. Full access is now enabled.",
        "rejected": f"Your KYC was rejected: {body.rejection_reason or 'Please resubmit'}.",
        "resubmit": "Please resubmit your KYC documents.",
    }
    create_notification(result["user_id"], "kyc", f"KYC {body.decision.title()}",
                       msg.get(body.decision, ""))

    return {"status": "success", "message": f"KYC {body.decision}", "submission": result}


@router.get("/kyc/status")
async def my_kyc_status(request: Request):
    """User-facing: get own KYC status."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = get_user_kyc_status(payload["sub"])
    return {"status": "success", **result}


# ── PHISHING ─────────────────────────────────────────────────────────────────

@router.post("/security/scan")
async def scan_content(body: PhishingScanRequest, request: Request):
    """Phishing detection scan. Multi-layer pipeline."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    payload = verify_jwt(token) if token else None
    user_id = payload["sub"] if payload else None

    url = body.url or ""
    content = body.content or url

    # Layer 1: Rule Engine
    risk_score = 0
    threat_types = []

    # Check suspicious TLDs
    suspicious_tlds = [".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq", ".buzz", ".club"]
    if any(url.lower().endswith(tld) for tld in suspicious_tlds):
        risk_score += 30
        threat_types.append("suspicious_tld")

    # Check for IP-based URLs
    import re
    if re.match(r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
        risk_score += 25
        threat_types.append("ip_based_url")

    # Check for homograph attacks
    homograph_chars = {'а': 'a', 'е': 'e', 'і': 'i', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y'}
    if any(c in url for c in homograph_chars):
        risk_score += 40
        threat_types.append("homograph_attack")

    # Check for urgency keywords
    urgency_words = ["urgent", "immediately", "verify your", "suspend", "expire", "click here",
                     "confirm your", "update your", "unusual activity", "unauthorized"]
    content_lower = content.lower()
    if any(w in content_lower for w in urgency_words):
        risk_score += 20
        threat_types.append("urgency_tactics")

    # Check for credential harvesting
    harvesting_indicators = ["password", "ssn", "social security", "credit card", "bank account",
                           "login credentials", "verify identity"]
    if any(w in content_lower for w in harvesting_indicators):
        risk_score += 25
        threat_types.append("credential_harvesting")

    risk_score = min(100, risk_score)

    # Create threat record
    threat = create_phishing_threat(
        url=url if url else None,
        risk_score=risk_score,
        threat_types=threat_types,
        detected_by=user_id,
    )

    # Determine action
    if risk_score > 70:
        action = "blocked"
        msg = "High-risk content detected and blocked."
        if user_id:
            create_notification(user_id, "security", "Phishing Threat Blocked",
                              f"A high-risk URL/content has been blocked. Risk score: {risk_score}")
    elif risk_score > 40:
        action = "warning"
        msg = "Suspicious content detected. Proceed with caution."
    else:
        action = "allowed"
        msg = "Content appears safe."

    return {
        "status": "success",
        "action": action,
        "risk_score": risk_score,
        "threat_types": threat_types,
        "message": msg,
        "threat_id": threat["id"],
    }


@router.get("/phishing/logs")
async def phishing_logs(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
):
    _require_admin(request)
    result = get_phishing_threats(page, per_page, status)
    return {"status": "success", **result}


@router.get("/phishing/stats")
async def phishing_stats(request: Request):
    _require_admin(request)
    stats = get_phishing_stats()
    return {"status": "success", "stats": stats}


@router.post("/phishing/{threat_id}/action")
async def phishing_action(threat_id: str, body: PhishingActionRequest, request: Request):
    admin = _require_admin(request)
    ip, ua = _get_client_info(request)

    updates = {"status": body.action}
    if body.action == "escalate":
        updates["escalated_by"] = admin["sub"]
        updates["status"] = "flagged"
    elif body.action == "dismiss":
        updates["status"] = "dismissed"

    result = update_phishing_threat(threat_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Threat not found")

    log_audit(admin["sub"], f"phishing_{body.action}", "phishing_threat", threat_id,
              after_state=updates, ip_address=ip, user_agent=ua)

    return {"status": "success", "message": f"Threat {body.action}d", "threat": result}


# ── AUDIT LOGS ───────────────────────────────────────────────────────────────

@router.get("/logs/audit")
async def audit_logs(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    admin_id: Optional[str] = None,
    action_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    _require_admin(request)
    result = get_audit_logs(page, per_page, admin_id, action_type, date_from, date_to)
    return {"status": "success", **result}


@router.get("/logs/system")
async def system_logs(request: Request, lines: int = Query(100, ge=1, le=500)):
    _require_admin(request)
    log_file = os.path.join(os.path.dirname(__file__), "..", "fastapi.log")
    log_lines = []
    if os.path.exists(log_file):
        with open(log_file, "r") as f:
            log_lines = f.readlines()[-lines:]
    return {"status": "success", "logs": [l.strip() for l in log_lines]}


# ── NOTIFICATIONS ────────────────────────────────────────────────────────────

@router.get("/notifications")
async def my_notifications(request: Request):
    """Get current user's notifications."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    notifs = get_user_notifications(payload["sub"])
    notifs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"status": "success", "notifications": notifs[:50]}


# ── REPORTS ──────────────────────────────────────────────────────────────────

@router.get("/reports/generate")
async def generate_report(
    request: Request,
    report_type: str = Query(...),
    format: str = Query("csv"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
):
    _require_admin(request)

    data_map = {
        "users": "portal_users.json",
        "kyc": "kyc_submissions.json",
        "phishing": "phishing_threats.json",
        "activity": "audit_logs.json",
        "login_events": "login_events.json",
    }

    filename = data_map.get(report_type)
    if not filename:
        raise HTTPException(status_code=400, detail="Invalid report type")

    records = _load(filename)

    # Filter by date range
    if date_from:
        records = [r for r in records if r.get("created_at", r.get("timestamp", "")) >= date_from]
    if date_to:
        records = [r for r in records if r.get("created_at", r.get("timestamp", "")) <= date_to]

    # Remove sensitive fields
    for r in records:
        r.pop("password_hash", None)

    # Generate CSV
    if not records:
        output = io.StringIO()
        output.write("No data found for the specified criteria.\n")
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=records[0].keys(), extrasaction='ignore')
        writer.writeheader()
        for r in records:
            # Flatten nested dicts
            flat = {}
            for k, v in r.items():
                flat[k] = str(v) if isinstance(v, (dict, list)) else v
            writer.writerow(flat)

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={report_type}_report_{datetime.now().strftime('%Y%m%d')}.csv"},
    )


# ── USER PROFILE (user-facing) ──────────────────────────────────────────────

@router.get("/profile")
async def get_profile(request: Request):
    """User-facing profile endpoint."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = get_portal_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"status": "success", "user": user}


@router.get("/login-history")
async def login_history(request: Request):
    """User-facing login history."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    events = _load("login_events.json")
    user_events = [e for e in events if e.get("user_id") == payload["sub"]]
    user_events.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"status": "success", "events": user_events[:50]}
