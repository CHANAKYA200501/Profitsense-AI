import json
import os
import hashlib
from typing import List, Optional
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "users.json")

def _ensure_db_exists():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    if not os.path.exists(DB_PATH):
        # Initial Seed: Admin user
        admin_pwd = hashlib.sha256("admin123".encode()).hexdigest()
        initial_users = [{
            "id": "admin-001",
            "email": "admin@profitsense.ai",
            "password_hash": admin_pwd,
            "role": "admin",
            "created_at": datetime.now().isoformat(),
            "last_login": None,
            "status": "active"
        }]
        with open(DB_PATH, "w") as f:
            json.dump(initial_users, f, indent=2)

def get_users() -> List[dict]:
    _ensure_db_exists()
    with open(DB_PATH, "r") as f:
        return json.load(f)

def save_users(users: List[dict]):
    with open(DB_PATH, "w") as f:
        json.dump(users, f, indent=2)

def find_user_by_email(email: str) -> Optional[dict]:
    users = get_users()
    for user in users:
        if user["email"].lower() == email.lower():
            return user
    return None

def add_user(email: str, password_plain: str, role: str = "user") -> dict:
    users = get_users()
    pwd_hash = hashlib.sha256(password_plain.encode()).hexdigest()
    new_user = {
        "id": f"u-{int(datetime.now().timestamp())}",
        "email": email.lower(),
        "password_hash": pwd_hash,
        "role": role,
        "created_at": datetime.now().isoformat(),
        "last_login": None,
        "status": "active"
    }
    users.append(new_user)
    save_users(users)
    return new_user

def update_last_login(email: str):
    users = get_users()
    for user in users:
        if user["email"].lower() == email.lower():
            user["last_login"] = datetime.now().isoformat()
            break
    save_users(users)
