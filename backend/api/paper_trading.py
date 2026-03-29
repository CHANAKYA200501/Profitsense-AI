from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime
from integration.brokers import get_broker_client

router = APIRouter()
broker = get_broker_client(mode="PAPER")

# Global in-memory state
PAPER_TRADES = []
DEMO_CASH_BALANCE = 1000000.0  # ₹10 Lakh starting cash
WALLET_TRANSACTIONS = []       # Fund-add history


class TradeExecutionRequest(BaseModel):
    symbol: str
    direction: str
    quantity: int
    entry_price: float
    target: float
    stop_loss: float
    risk_tag: str
    confidence: float


class ManualTradeRequest(BaseModel):
    symbol: str
    direction: str   # "BUY" or "SELL"
    quantity: int
    order_type: str  # "MARKET" or "LIMIT"
    limit_price: Optional[float] = None


class AddFundsRequest(BaseModel):
    amount: float
    payment_method: str  # "UPI", "CARD", "NETBANKING"
    transaction_ref: str


@router.post("/execute")
async def execute_trade(trade: TradeExecutionRequest):
    """Executes a trade on the active broker instance and saves it to the local portfolio tracking."""
    global DEMO_CASH_BALANCE

    trade_cost = trade.quantity * trade.entry_price
    if DEMO_CASH_BALANCE < trade_cost:
        return {
            "status": "error",
            "message": f"Insufficient Demo Balance. Required: ₹{trade_cost:,.2f}, Available: ₹{DEMO_CASH_BALANCE:,.2f}"
        }

    broker_response = broker.place_order(
        symbol=trade.symbol,
        quantity=trade.quantity,
        side=trade.direction
    )

    new_trade = {
        "id": f"TRD-{uuid.uuid4().hex[:6].upper()}",
        "broker_order_id": broker_response.get("order_id"),
        "symbol": trade.symbol,
        "direction": trade.direction,
        "entry_price": trade.entry_price,
        "target": trade.target,
        "stop_loss": trade.stop_loss,
        "risk_tag": trade.risk_tag,
        "confidence": trade.confidence,
        "quantity": trade.quantity,
        "order_type": "AI_SIGNAL",
        "status": "OPEN",
        "profit_loss": 0.0,
        "timestamp": datetime.now().isoformat()
    }
    DEMO_CASH_BALANCE -= trade_cost
    PAPER_TRADES.append(new_trade)

    return {
        "status": "success",
        "message": f"Successfully executed '{trade.direction}' on {trade.symbol}",
        "trade": new_trade
    }


@router.post("/manual_execute")
async def manual_execute(trade: ManualTradeRequest):
    """Execute a manual BUY/SELL order without requiring AI risk parameters."""
    global DEMO_CASH_BALANCE

    # Determine effective price
    if trade.order_type == "LIMIT" and trade.limit_price:
        exec_price = trade.limit_price
    else:
        # Market order: fetch live LTP
        try:
            import yfinance as yf
            import math
            ticker_map = {"NIFTY 50": "^NSEI", "SENSEX": "^BSESN"}
            yf_sym = ticker_map.get(trade.symbol, f"{trade.symbol}.NS")
            hist = yf.Ticker(yf_sym).history(period="1d")
            exec_price = float(hist["Close"].iloc[-1]) if not hist.empty else 0.0
            if math.isnan(exec_price) or exec_price == 0:
                return {"status": "error", "message": f"Could not fetch live price for {trade.symbol}"}
        except Exception as e:
            return {"status": "error", "message": f"Price fetch failed: {str(e)}"}

    trade_cost = trade.quantity * exec_price

    if trade.direction.upper() == "BUY":
        if DEMO_CASH_BALANCE < trade_cost:
            return {
                "status": "error",
                "message": f"Insufficient funds. Need ₹{trade_cost:,.0f}, have ₹{DEMO_CASH_BALANCE:,.0f}"
            }
        DEMO_CASH_BALANCE -= trade_cost

    new_trade = {
        "id": f"MNL-{uuid.uuid4().hex[:6].upper()}",
        "broker_order_id": f"ORD-{uuid.uuid4().hex[:8].upper()}",
        "symbol": trade.symbol,
        "direction": trade.direction.upper(),
        "entry_price": round(exec_price, 2),
        "target": round(exec_price * 1.05, 2),
        "stop_loss": round(exec_price * 0.97, 2),
        "risk_tag": "MANUAL",
        "confidence": 0,
        "quantity": trade.quantity,
        "order_type": trade.order_type,
        "status": "OPEN",
        "profit_loss": 0.0,
        "timestamp": datetime.now().isoformat()
    }
    PAPER_TRADES.append(new_trade)

    return {
        "status": "success",
        "message": f"Manual {trade.direction.upper()} order placed for {trade.symbol} @ ₹{exec_price:,.2f}",
        "trade": new_trade,
        "remaining_balance": round(DEMO_CASH_BALANCE, 2)
    }


@router.post("/add_funds")
async def add_funds(req: AddFundsRequest):
    """Simulate a payment gateway credit to the paper trading wallet."""
    global DEMO_CASH_BALANCE

    if req.amount <= 0:
        return {"status": "error", "message": "Amount must be positive"}
    if req.amount > 10_000_000:
        return {"status": "error", "message": "Maximum single transaction: ₹1 Crore"}

    DEMO_CASH_BALANCE += req.amount

    txn = {
        "id": f"TXN-{uuid.uuid4().hex[:8].upper()}",
        "amount": req.amount,
        "method": req.payment_method,
        "ref": req.transaction_ref,
        "status": "CREDITED",
        "timestamp": datetime.now().isoformat(),
        "balance_after": round(DEMO_CASH_BALANCE, 2)
    }
    WALLET_TRANSACTIONS.append(txn)

    return {
        "status": "success",
        "message": f"₹{req.amount:,.0f} added via {req.payment_method}",
        "transaction": txn,
        "new_balance": round(DEMO_CASH_BALANCE, 2)
    }


@router.get("/wallet")
async def get_wallet():
    """Get wallet balance and transaction history."""
    return {
        "status": "success",
        "balance": round(DEMO_CASH_BALANCE, 2),
        "transactions": WALLET_TRANSACTIONS[-20:]  # Last 20
    }


@router.get("/positions")
async def get_positions():
    """Retrieve all open paper trades."""
    import random
    for t in PAPER_TRADES:
        if t["status"] == "OPEN":
            variance = random.uniform(-0.02, 0.03)
            t["profit_loss"] = round((t["entry_price"] * variance) * t["quantity"], 2)

    return {
        "status": "success",
        "positions": PAPER_TRADES
    }


@router.get("/metrics")
async def get_metrics():
    """Retrieve live portfolio risk assessment metrics."""
    import random
    active_investment = 0.0

    for t in PAPER_TRADES:
        if t["status"] == "OPEN":
            variance = random.uniform(-0.02, 0.03)
            t["profit_loss"] = round((t["entry_price"] * variance) * t["quantity"], 2)
            active_val = (t["entry_price"] * t["quantity"]) + t["profit_loss"]
            active_investment += active_val

    total_portfolio_value = DEMO_CASH_BALANCE + active_investment
    exposure_pct = round((active_investment / total_portfolio_value) * 100, 1) if total_portfolio_value else 0.0

    return {
        "status": "success",
        "metrics": {
            "total_portfolio_value": round(total_portfolio_value, 2),
            "cash_reserves": round(DEMO_CASH_BALANCE, 2),
            "overall_risk_score": "MEDIUM" if exposure_pct < 60 else "HIGH",
            "active_exposure": f"{exposure_pct}%",
            "max_drawdown_limit": "15%"
        }
    }


class TradeExecutionRequest(BaseModel):
    symbol: str
    direction: str
    quantity: int
    entry_price: float
    target: float
    stop_loss: float
    risk_tag: str
    confidence: float

@router.post("/execute")
async def execute_trade(trade: TradeExecutionRequest):
    """Executes a trade on the active broker instance and saves it to the local portfolio tracking."""
    global DEMO_CASH_BALANCE
    
    trade_cost = trade.quantity * trade.entry_price
    if DEMO_CASH_BALANCE < trade_cost:
        return {
            "status": "error",
            "message": f"Insufficient Demo Balance. Required: ₹{trade_cost:,.2f}, Available: ₹{DEMO_CASH_BALANCE:,.2f}"
        }

    # 1. Execute via abstract broker (simulated in PAPER mode)
    broker_response = broker.place_order(
        symbol=trade.symbol,
        quantity=trade.quantity,
        side=trade.direction
    )
    
    # 2. Track in local database (mocked in-memory list for demo stability)
    new_trade = {
        "id": f"TRD-{uuid.uuid4().hex[:6].upper()}",
        "broker_order_id": broker_response.get("order_id"),
        "symbol": trade.symbol,
        "direction": trade.direction,
        "entry_price": trade.entry_price,
        "target": trade.target,
        "stop_loss": trade.stop_loss,
        "risk_tag": trade.risk_tag,
        "confidence": trade.confidence,
        "quantity": trade.quantity,
        "status": "OPEN",
        "profit_loss": 0.0,
        "timestamp": datetime.now().isoformat()
    }
    DEMO_CASH_BALANCE -= trade_cost
    PAPER_TRADES.append(new_trade)
    
    return {
        "status": "success",
        "message": f"Successfully executed '{trade.direction}' on {trade.symbol}",
        "trade": new_trade
    }

@router.get("/positions")
async def get_positions():
    """Retrieve all open paper trades."""
    # In real world, query `db.query(PaperTrade).filter(status='OPEN')`
    
    # Simulate simple P&L variance natively
    import random
    for t in PAPER_TRADES:
        if t["status"] == "OPEN":
             variance = random.uniform(-0.02, 0.03) # Simulating slight movement since entry
             t["profit_loss"] = round((t["entry_price"] * variance) * t["quantity"], 2)
             
    return {
        "status": "success",
        "positions": PAPER_TRADES
    }

@router.get("/metrics")
async def get_metrics():
    """Retrieve live portfolio risk assessment metrics."""
    # Recalculate P&L before computing totals
    import random
    active_investment = 0.0
    
    for t in PAPER_TRADES:
        if t["status"] == "OPEN":
             variance = random.uniform(-0.02, 0.03) 
             t["profit_loss"] = round((t["entry_price"] * variance) * t["quantity"], 2)
             active_val = (t["entry_price"] * t["quantity"]) + t["profit_loss"]
             active_investment += active_val

    total_portfolio_value = DEMO_CASH_BALANCE + active_investment
    exposure_pct = round((active_investment / total_portfolio_value) * 100, 1) if total_portfolio_value else 0.0

    return {
        "status": "success",
        "metrics": {
            "total_portfolio_value": round(total_portfolio_value, 2),
            "cash_reserves": round(DEMO_CASH_BALANCE, 2),
            "overall_risk_score": "MEDIUM" if exposure_pct < 60 else "HIGH",
            "active_exposure": f"{exposure_pct}%",
            "max_drawdown_limit": "15%"
        }
    }
