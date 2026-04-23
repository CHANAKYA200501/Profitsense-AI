import json
import os
from typing import List

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
TRADES_DB_PATH = os.path.join(DATA_DIR, "trades.json")
WALLET_DB_PATH = os.path.join(DATA_DIR, "wallet.json")
BALANCE_DB_PATH = os.path.join(DATA_DIR, "balance.json")

def _ensure_trade_db_exists():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(TRADES_DB_PATH):
        with open(TRADES_DB_PATH, "w") as f:
            json.dump([], f)
    if not os.path.exists(WALLET_DB_PATH):
        with open(WALLET_DB_PATH, "w") as f:
            json.dump([], f)
    if not os.path.exists(BALANCE_DB_PATH):
        with open(BALANCE_DB_PATH, "w") as f:
            json.dump({"balance": 1000000.0}, f)

def get_trades() -> List[dict]:
    _ensure_trade_db_exists()
    try:
        with open(TRADES_DB_PATH, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_trades(trades: List[dict]):
    _ensure_trade_db_exists()
    with open(TRADES_DB_PATH, "w") as f:
        json.dump(trades, f, indent=2)

def get_wallet_transactions() -> List[dict]:
    _ensure_trade_db_exists()
    try:
        with open(WALLET_DB_PATH, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_wallet_transactions(txns: List[dict]):
    _ensure_trade_db_exists()
    with open(WALLET_DB_PATH, "w") as f:
        json.dump(txns, f, indent=2)

def get_balance() -> float:
    _ensure_trade_db_exists()
    try:
        with open(BALANCE_DB_PATH, "r") as f:
            data = json.load(f)
            return float(data.get("balance", 0.0))
    except json.JSONDecodeError:
        return 0.0

def save_balance(balance: float):
    _ensure_trade_db_exists()
    with open(BALANCE_DB_PATH, "w") as f:
        json.dump({"balance": balance}, f, indent=2)
