"""
Enhanced database layer for the security/admin portal.
JSON-file backed for development. Handles users, sessions, KYC, phishing, login events, and audit logs.
"""
import json
import os
import hashlib
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import threading

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
_lock = threading.Lock()


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _load(filename: str) -> List[dict]:
    _ensure_dir()
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        with open(path, "w") as f:
            json.dump([], f)
        return []
    with open(path, "r") as f:
        return json.load(f)


def _save(filename: str, data: List[dict]):
    _ensure_dir()
    path = os.path.join(DATA_DIR, filename)
    with _lock:
        with open(path, "w") as f:
            json.dump(data, f, indent=2, default=str)


# ── USERS ────────────────────────────────────────────────────────────────────

def _seed_admin():
    """Seed admin user if not exists."""
    from .security_utils import hash_password
    users = _load("portal_users.json")
    if not any(u["role"] == "admin" for u in users):
        admin = {
            "id": str(uuid.uuid4()),
            "email": "admin@etmind.ai",
            "name": "System Admin",
            "password_hash": hash_password("admin123"),
            "role": "admin",
            "status": "active",
            "dob": "1990-01-01",
            "terms_accepted_at": datetime.now().isoformat(),
            "email_verified_at": datetime.now().isoformat(),
            "totp_enabled": True,
            "failed_login_attempts": 0,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "deleted_at": None,
        }
        users.append(admin)
        _save("portal_users.json", users)
    return users


def get_portal_users(
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None,
    kyc_status: Optional[str] = None,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """Paginated & filtered user list."""
    users = _seed_admin()
    # Filter out deleted
    users = [u for u in users if not u.get("deleted_at")]
    
    if status:
        users = [u for u in users if u.get("status") == status]
    if kyc_status:
        kyc_subs = _load("kyc_submissions.json")
        kyc_map = {}
        for k in kyc_subs:
            kyc_map[k["user_id"]] = k["status"]
        users = [u for u in users if kyc_map.get(u["id"]) == kyc_status]
    if search:
        search_lower = search.lower()
        users = [u for u in users if search_lower in u.get("email", "").lower() or search_lower in u.get("name", "").lower()]
    
    total = len(users)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = users[start:end]
    
    # Strip sensitive fields
    safe_users = []
    for u in paginated:
        safe = {k: v for k, v in u.items() if k not in ("password_hash", "totp_enabled")}
        # Get KYC status
        kyc_subs = _load("kyc_submissions.json")
        user_kyc = [k for k in kyc_subs if k["user_id"] == u["id"]]
        safe["kyc_status"] = user_kyc[-1]["status"] if user_kyc else "not_submitted"
        # Get last login
        events = _load("login_events.json")
        user_logins = [e for e in events if e.get("user_id") == u["id"] and e.get("success")]
        safe["last_login"] = user_logins[-1]["created_at"] if user_logins else None
        safe_users.append(safe)
    
    return {
        "users": safe_users,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, (total + per_page - 1) // per_page),
    }


def get_portal_user_by_id(user_id: str) -> Optional[dict]:
    users = _seed_admin()
    for u in users:
        if u["id"] == user_id and not u.get("deleted_at"):
            safe = {k: v for k, v in u.items() if k != "password_hash"}
            # Attach KYC
            kyc_subs = _load("kyc_submissions.json")
            safe["kyc_submissions"] = [k for k in kyc_subs if k["user_id"] == user_id]
            # Attach login history
            events = _load("login_events.json")
            safe["login_history"] = [e for e in events if e.get("user_id") == user_id][-20:]
            # Attach activity
            activity = _load("audit_logs.json")
            safe["activity"] = [a for a in activity if a.get("target_id") == user_id][-20:]
            return safe
    return None


def find_portal_user_by_email(email: str) -> Optional[dict]:
    users = _seed_admin()
    for u in users:
        if u.get("email", "").lower() == email.lower() and not u.get("deleted_at"):
            return u
    return None


def create_portal_user(name: str, email: str, dob: str, password_hash: str) -> dict:
    users = _seed_admin()
    new_user = {
        "id": str(uuid.uuid4()),
        "email": email.lower(),
        "name": name,
        "password_hash": password_hash,
        "role": "user",
        "status": "pending_kyc",
        "dob": dob,
        "terms_accepted_at": datetime.now().isoformat(),
        "email_verified_at": None,
        "totp_enabled": False,
        "failed_login_attempts": 0,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "deleted_at": None,
    }
    users.append(new_user)
    _save("portal_users.json", users)
    return new_user


def update_portal_user(user_id: str, updates: dict) -> Optional[dict]:
    users = _seed_admin()
    for i, u in enumerate(users):
        if u["id"] == user_id:
            users[i] = {**u, **updates, "updated_at": datetime.now().isoformat()}
            _save("portal_users.json", users)
            return users[i]
    return None


def soft_delete_user(user_id: str) -> bool:
    users = _seed_admin()
    for i, u in enumerate(users):
        if u["id"] == user_id and u.get("role") != "admin":
            users[i]["deleted_at"] = datetime.now().isoformat()
            users[i]["email"] = f"deleted_{user_id}@anon.local"
            users[i]["name"] = "Deleted User"
            _save("portal_users.json", users)
            return True
    return False


# ── SESSIONS ─────────────────────────────────────────────────────────────────

def create_session(user_id: str, refresh_token_hash: str, ip: str, user_agent: str) -> dict:
    sessions = _load("sessions.json")
    session = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "refresh_token_hash": refresh_token_hash,
        "ip_address": ip,
        "user_agent": user_agent,
        "created_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=7)).isoformat(),
        "revoked_at": None,
    }
    sessions.append(session)
    _save("sessions.json", sessions)
    return session


def find_session_by_token_hash(token_hash: str) -> Optional[dict]:
    sessions = _load("sessions.json")
    for s in sessions:
        if s["refresh_token_hash"] == token_hash and not s.get("revoked_at"):
            return s
    return None


def revoke_session(session_id: str):
    sessions = _load("sessions.json")
    for i, s in enumerate(sessions):
        if s["id"] == session_id:
            sessions[i]["revoked_at"] = datetime.now().isoformat()
    _save("sessions.json", sessions)


def revoke_user_sessions(user_id: str):
    sessions = _load("sessions.json")
    for i, s in enumerate(sessions):
        if s["user_id"] == user_id and not s.get("revoked_at"):
            sessions[i]["revoked_at"] = datetime.now().isoformat()
    _save("sessions.json", sessions)


# ── LOGIN EVENTS ─────────────────────────────────────────────────────────────

def log_login_event(user_id: str, success: bool, ip: str, user_agent: str,
                    country: str = "Unknown", failure_reason: str = None) -> dict:
    events = _load("login_events.json")
    event = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "success": success,
        "ip_address": ip,
        "country": country,
        "user_agent": user_agent,
        "failure_reason": failure_reason,
        "created_at": datetime.now().isoformat(),
    }
    events.append(event)
    _save("login_events.json", events)
    return event


def get_recent_failures(user_id: str, minutes: int = 10) -> int:
    events = _load("login_events.json")
    cutoff = (datetime.now() - timedelta(minutes=minutes)).isoformat()
    count = 0
    for e in events:
        if e["user_id"] == user_id and not e["success"] and e["created_at"] > cutoff:
            count += 1
    return count


# ── KYC SUBMISSIONS ─────────────────────────────────────────────────────────

def create_kyc_submission(user_id: str, document_type: str, file_key: str, personal_info: dict) -> dict:
    subs = _load("kyc_submissions.json")
    submission = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "document_type": document_type,
        "document_s3_key": file_key,
        "personal_info": personal_info,
        "status": "pending",
        "rejection_reason": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "submitted_at": datetime.now().isoformat(),
    }
    subs.append(submission)
    _save("kyc_submissions.json", subs)
    return submission


def get_pending_kyc(page: int = 1, per_page: int = 20) -> Dict[str, Any]:
    subs = _load("kyc_submissions.json")
    pending = [s for s in subs if s["status"] == "pending"]
    total = len(pending)
    start = (page - 1) * per_page
    
    # Enrich with user data
    users = _seed_admin()
    user_map = {u["id"]: u for u in users}
    
    for s in pending:
        user = user_map.get(s["user_id"], {})
        s["user_name"] = user.get("name", "Unknown")
        s["user_email"] = user.get("email", "Unknown")
    
    return {
        "submissions": pending[start:start + per_page],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def review_kyc(submission_id: str, decision: str, admin_id: str, reason: str = None) -> Optional[dict]:
    subs = _load("kyc_submissions.json")
    for i, s in enumerate(subs):
        if s["id"] == submission_id:
            subs[i]["status"] = decision
            subs[i]["reviewed_by"] = admin_id
            subs[i]["reviewed_at"] = datetime.now().isoformat()
            if reason:
                subs[i]["rejection_reason"] = reason
            _save("kyc_submissions.json", subs)
            
            # If approved, update user status
            if decision == "approved":
                update_portal_user(s["user_id"], {"status": "active"})
            
            return subs[i]
    return None


def get_user_kyc_status(user_id: str) -> dict:
    subs = _load("kyc_submissions.json")
    user_subs = [s for s in subs if s["user_id"] == user_id]
    if not user_subs:
        return {"status": "not_submitted", "submissions": []}
    latest = user_subs[-1]
    return {"status": latest["status"], "submissions": user_subs}


# ── PHISHING THREATS ─────────────────────────────────────────────────────────

def create_phishing_threat(
    url: str = None, content_hash: str = None, risk_score: int = 0,
    threat_types: List[str] = None, detected_by: str = None
) -> dict:
    threats = _load("phishing_threats.json")
    threat = {
        "id": str(uuid.uuid4()),
        "detected_by_user_id": detected_by,
        "content_hash": content_hash or hashlib.sha256((url or "").encode()).hexdigest(),
        "url": url,
        "risk_score": risk_score,
        "threat_types": threat_types or [],
        "status": "blocked" if risk_score > 70 else "flagged" if risk_score > 40 else "allowed",
        "escalated_by": None,
        "analysis_details": None,
        "created_at": datetime.now().isoformat(),
    }
    threats.append(threat)
    _save("phishing_threats.json", threats)
    return threat


def get_phishing_threats(
    page: int = 1, per_page: int = 20,
    status: Optional[str] = None,
) -> Dict[str, Any]:
    threats = _load("phishing_threats.json")
    if status:
        threats = [t for t in threats if t["status"] == status]
    threats.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    total = len(threats)
    start = (page - 1) * per_page
    return {
        "threats": threats[start:start + per_page],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def get_phishing_stats() -> dict:
    threats = _load("phishing_threats.json")
    today = datetime.now().strftime("%Y-%m-%d")
    today_threats = [t for t in threats if t.get("created_at", "").startswith(today)]
    
    type_counts: Dict[str, int] = {}
    for t in threats:
        for tt in t.get("threat_types", []):
            type_counts[tt] = type_counts.get(tt, 0) + 1
    
    return {
        "total_threats": len(threats),
        "threats_today": len(today_threats),
        "blocked": len([t for t in threats if t["status"] == "blocked"]),
        "flagged": len([t for t in threats if t["status"] == "flagged"]),
        "dismissed": len([t for t in threats if t["status"] == "dismissed"]),
        "top_threat_types": sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:5],
        "users_affected": len(set(t.get("detected_by_user_id") for t in threats if t.get("detected_by_user_id"))),
    }


def update_phishing_threat(threat_id: str, updates: dict) -> Optional[dict]:
    threats = _load("phishing_threats.json")
    for i, t in enumerate(threats):
        if t["id"] == threat_id:
            threats[i] = {**t, **updates}
            _save("phishing_threats.json", threats)
            return threats[i]
    return None


# ── AUDIT LOGS ───────────────────────────────────────────────────────────────

def log_audit(
    admin_id: str, action_type: str, target_type: str, target_id: str,
    before_state: dict = None, after_state: dict = None,
    ip_address: str = "", user_agent: str = ""
) -> dict:
    logs = _load("audit_logs.json")
    entry = {
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "action_type": action_type,
        "target_type": target_type,
        "target_id": target_id,
        "before_state": before_state,
        "after_state": after_state,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "timestamp": datetime.now().isoformat(),
    }
    logs.append(entry)
    _save("audit_logs.json", logs)
    return entry


def get_audit_logs(
    page: int = 1, per_page: int = 50,
    admin_id: Optional[str] = None,
    action_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> Dict[str, Any]:
    logs = _load("audit_logs.json")
    if admin_id:
        logs = [l for l in logs if l.get("admin_id") == admin_id]
    if action_type:
        logs = [l for l in logs if l.get("action_type") == action_type]
    if date_from:
        logs = [l for l in logs if l.get("timestamp", "") >= date_from]
    if date_to:
        logs = [l for l in logs if l.get("timestamp", "") <= date_to]
    
    logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    total = len(logs)
    start = (page - 1) * per_page
    return {
        "logs": logs[start:start + per_page],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


# ── NOTIFICATIONS ────────────────────────────────────────────────────────────

def create_notification(user_id: str, type: str, title: str, message: str) -> dict:
    notifs = _load("notifications.json")
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": type,
        "title": title,
        "message": message,
        "read": False,
        "created_at": datetime.now().isoformat(),
    }
    notifs.append(notif)
    _save("notifications.json", notifs)
    return notif


def get_user_notifications(user_id: str) -> List[dict]:
    notifs = _load("notifications.json")
    return [n for n in notifs if n["user_id"] == user_id]


# ── DASHBOARD STATS ──────────────────────────────────────────────────────────

def get_dashboard_stats() -> dict:
    users = _seed_admin()
    active_users = [u for u in users if not u.get("deleted_at")]
    kyc_subs = _load("kyc_submissions.json")
    threats = _load("phishing_threats.json")
    events = _load("login_events.json")
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Sessions active in last 15 min
    sessions = _load("sessions.json")
    cutoff = (datetime.now() - timedelta(minutes=15)).isoformat()
    active_sessions = [s for s in sessions if not s.get("revoked_at") and s.get("created_at", "") > cutoff]
    
    # Daily logins for chart (last 30 days)
    daily_logins = {}
    for i in range(30):
        d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_logins[d] = 0
    for e in events:
        if e.get("success"):
            day = e.get("created_at", "")[:10]
            if day in daily_logins:
                daily_logins[day] += 1
    
    # Hourly suspicious activity for heatmap
    hourly_suspicious = [0] * 24
    failed_events = [e for e in events if not e.get("success")]
    for e in failed_events:
        try:
            hour = int(e.get("created_at", "T00:")[11:13])
            hourly_suspicious[hour] += 1
        except (ValueError, IndexError):
            pass
    
    return {
        "total_users": len(active_users),
        "active_sessions": len(active_sessions),
        "pending_kyc": len([k for k in kyc_subs if k["status"] == "pending"]),
        "phishing_alerts_today": len([t for t in threats if t.get("created_at", "").startswith(today)]),
        "blocked_accounts": len([u for u in active_users if u.get("status") == "blocked"]),
        "daily_logins": [{"date": k, "count": v} for k, v in sorted(daily_logins.items())],
        "hourly_suspicious": hourly_suspicious,
    }
