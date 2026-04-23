"""
Admin API — protected endpoints for the ProfitSense AI Admin Panel.
All routes require a valid Supabase JWT in the Authorization header.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
import os
import time
from datetime import datetime

# Import shared in-memory stores and DB helpers
from .trade_db import get_trades, save_trades, get_balance, save_balance
from .db import get_users, save_users

router = APIRouter()

# ── Global in-memory signal store (populated by main.py scan) ──────────────
# We reference the list directly from the signals module to keep it in sync.
_ADMIN_SIGNALS_REF = []  # filled via set_signals_ref() called from main.py

def set_signals_ref(signals_list: list):
    global _ADMIN_SIGNALS_REF
    _ADMIN_SIGNALS_REF = signals_list


# ── Platform uptime tracking ──────────────────────────────────────────────
_START_TIME = time.time()
_ACTIVITY_LOG: list = []

def log_activity(event: str, detail: str = ""):
    _ACTIVITY_LOG.append({
        "ts": datetime.now().isoformat(),
        "event": event,
        "detail": detail,
    })
    if len(_ACTIVITY_LOG) > 200:
        _ACTIVITY_LOG.pop(0)


# ── Auth helper: verify Admin role ───────────────────────────────────────────
def get_admin_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth.split(" ", 1)[1]
    
    # In this mock system, the token contains the user ID (mock-jwt-ID)
    if not token.startswith("mock-jwt-"):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = token.replace("mock-jwt-", "")
    users = get_users()
    admin_user = next((u for u in users if u["id"] == user_id), None)
    
    if not admin_user or admin_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied: Administrator role required")
        
    return token


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(token: str = Depends(get_admin_token)):
    """Platform-wide stats for the admin overview page."""
    uptime_secs = int(time.time() - _START_TIME)
    hours, rem = divmod(uptime_secs, 3600)
    mins, secs = divmod(rem, 60)

    trades = get_trades()
    open_trades = [t for t in trades if t.get("status") == "OPEN"]
    total_pnl = sum(t.get("profit_loss", 0) for t in trades)

    return {
        "status": "success",
        "stats": {
            "uptime": f"{hours}h {mins}m {secs}s",
            "total_signals": len(_ADMIN_SIGNALS_REF),
            "total_trades": len(trades),
            "open_trades": len(open_trades),
            "total_pnl": round(total_pnl, 2),
            "demo_cash": round(get_balance(), 2),
            "activity_events": len(_ACTIVITY_LOG),
        },
    }


@router.get("/signals")
async def list_signals(
    limit: int = 50,
    symbol: Optional[str] = None,
    direction: Optional[str] = None,
    token: str = Depends(get_admin_token),
):
    signals = list(_ADMIN_SIGNALS_REF)
    if symbol:
        signals = [s for s in signals if s.get("symbol", "").upper() == symbol.upper()]
    if direction:
        signals = [s for s in signals if s.get("direction", "").lower() == direction.lower()]
    return {"status": "success", "count": len(signals), "signals": signals[:limit]}


@router.delete("/signals/{signal_id}")
async def delete_signal(signal_id: str, token: str = Depends(get_admin_token)):
    before = len(_ADMIN_SIGNALS_REF)
    _ADMIN_SIGNALS_REF[:] = [s for s in _ADMIN_SIGNALS_REF if s.get("id") != signal_id]
    after = len(_ADMIN_SIGNALS_REF)
    if before == after:
        raise HTTPException(status_code=404, detail="Signal not found")
    log_activity("signal_deleted", f"id={signal_id}")
    return {"status": "success", "message": f"Signal {signal_id} deleted"}


@router.delete("/signals")
async def clear_all_signals(token: str = Depends(get_admin_token)):
    count = len(_ADMIN_SIGNALS_REF)
    _ADMIN_SIGNALS_REF.clear()
    log_activity("signals_cleared", f"Cleared {count} signals")
    return {"status": "success", "message": f"Cleared {count} signals"}


@router.get("/trades")
async def list_trades(token: str = Depends(get_admin_token)):
    import random
    trades_list = []
    for t in get_trades():
        trade = dict(t)
        if trade.get("status") == "OPEN":
            variance = random.uniform(-0.02, 0.03)
            trade["profit_loss"] = round((trade["entry_price"] * variance) * trade["quantity"], 2)
        trades_list.append(trade)
    return {"status": "success", "count": len(trades_list), "trades": trades_list}


@router.delete("/trades/{trade_id}")
async def close_trade(trade_id: str, token: str = Depends(get_admin_token)):
    trades = get_trades()
    for t in trades:
        if t.get("id") == trade_id:
            t["status"] = "CLOSED"
            save_trades(trades)
            log_activity("trade_closed", f"id={trade_id}")
            return {"status": "success", "message": f"Trade {trade_id} closed"}
    raise HTTPException(status_code=404, detail="Trade not found")


@router.get("/logs")
async def get_logs(lines: int = 100, token: str = Depends(get_admin_token)):
    """Returns recent in-memory activity events + last N lines of disk log if available."""
    disk_lines = []
    log_path = os.path.join(os.path.dirname(__file__), "..", "fastapi.log")
    try:
        if os.path.exists(log_path):
            with open(log_path, "r") as f:
                all_lines = f.readlines()
                disk_lines = [l.rstrip() for l in all_lines[-lines:]]
    except Exception:
        pass

    return {
        "status": "success",
        "activity": list(reversed(_ACTIVITY_LOG[-50:])),
        "server_log": disk_lines,
    }


# ── User Management ───────────────────────────────────────────────────────

@router.get("/users")
async def list_users(token: str = Depends(get_admin_token)):
    """List all registered users (Admin only)."""
    users = get_users()
    # Filter out sensitive info before returning
    safe_users = [{
        "id": u["id"],
        "email": u["email"],
        "role": u["role"],
        "created_at": u["created_at"],
        "last_login": u["last_login"],
        "status": u["status"]
    } for u in users]
    return {"status": "success", "count": len(safe_users), "users": safe_users}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, token: str = Depends(get_admin_token)):
    """Delete a user account (Admin only)."""
    users = get_users()
    before = len(users)
    updated_users = [u for u in users if u["id"] != user_id]
    
    if len(updated_users) == before:
        raise HTTPException(status_code=404, detail="User not found")
        
    save_users(updated_users)
    log_activity("user_deleted", f"id={user_id}")
    return {"status": "success", "message": f"User {user_id} deleted"}

@router.post("/reset-demo-balance")
async def reset_demo_balance(token: str = Depends(get_admin_token)):
    """Reset demo cash balance back to ₹10 Lakh."""
    save_balance(1000000.0)
    save_trades([])
    log_activity("demo_reset", "Balance reset to ₹10,00,000 and all trades cleared")
    return {"status": "success", "message": "Demo balance reset to ₹10,00,000", "new_balance": 1000000.0}
