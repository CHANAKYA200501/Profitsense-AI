"""
Backtest API — Run simple strategy backtests against historical NSE data via yfinance.
"""
from fastapi import APIRouter
from pydantic import BaseModel
import yfinance as yf
import math

router = APIRouter()


class BacktestRequest(BaseModel):
    symbol: str = "RELIANCE"
    strategy: str = "SMA_CROSSOVER"   # SMA_CROSSOVER | RSI_REVERSAL | MACD_SIGNAL
    period: str = "1y"                 # 3mo | 6mo | 1y | 2y | 5y
    initial_capital: float = 100000
    sma_fast: int = 10
    sma_slow: int = 30
    rsi_buy: int = 30
    rsi_sell: int = 70


def _safe(val, default=0.0):
    try:
        f = float(val)
        return default if (math.isnan(f) or math.isinf(f)) else f
    except (TypeError, ValueError):
        return default


def _compute_rsi(closes, period=14):
    """Compute RSI series from a list of close prices."""
    rsi_values = [50.0] * period  # pad initial values
    for i in range(period, len(closes)):
        gains, losses = 0.0, 0.0
        for j in range(i - period, i):
            delta = closes[j + 1] - closes[j] if j + 1 < len(closes) else 0
            if delta > 0:
                gains += delta
            else:
                losses -= delta
        avg_gain = gains / period
        avg_loss = losses / period
        if avg_loss == 0:
            rsi_values.append(100.0)
        else:
            rs = avg_gain / avg_loss
            rsi_values.append(100 - (100 / (1 + rs)))
    return rsi_values


def _compute_macd(closes, fast=12, slow=26, signal=9):
    """Compute MACD line and signal line."""
    def ema(data, span):
        result = [data[0]]
        mult = 2 / (span + 1)
        for i in range(1, len(data)):
            result.append(data[i] * mult + result[-1] * (1 - mult))
        return result

    ema_fast = ema(closes, fast)
    ema_slow = ema(closes, slow)
    macd_line = [f - s for f, s in zip(ema_fast, ema_slow)]
    signal_line = ema(macd_line, signal)
    return macd_line, signal_line


@router.post("/run")
async def run_backtest(req: BacktestRequest):
    """Execute a backtest and return performance metrics + trade log."""
    try:
        ticker_map = {"NIFTY 50": "^NSEI", "SENSEX": "^BSESN"}
        yf_sym = ticker_map.get(req.symbol, f"{req.symbol}.NS")

        df = yf.Ticker(yf_sym).history(period=req.period, interval="1d")
        df = df.dropna(subset=["Close"])
        if df.empty or len(df) < 35:
            return {"status": "error", "error": f"Insufficient data for {req.symbol}"}

        closes = [_safe(c) for c in df["Close"].tolist()]
        dates = [d.strftime("%Y-%m-%d") for d in df.index]

        # Generate signals based on strategy
        signals = []  # list of (index, 'BUY' | 'SELL')

        if req.strategy == "SMA_CROSSOVER":
            fast_ma, slow_ma = [], []
            for i in range(len(closes)):
                fast_ma.append(sum(closes[max(0, i - req.sma_fast + 1):i + 1]) / min(i + 1, req.sma_fast))
                slow_ma.append(sum(closes[max(0, i - req.sma_slow + 1):i + 1]) / min(i + 1, req.sma_slow))
            for i in range(req.sma_slow, len(closes)):
                if fast_ma[i] > slow_ma[i] and fast_ma[i - 1] <= slow_ma[i - 1]:
                    signals.append((i, "BUY"))
                elif fast_ma[i] < slow_ma[i] and fast_ma[i - 1] >= slow_ma[i - 1]:
                    signals.append((i, "SELL"))

        elif req.strategy == "RSI_REVERSAL":
            rsi = _compute_rsi(closes, 14)
            for i in range(15, len(closes)):
                if rsi[i] < req.rsi_buy and rsi[i - 1] >= req.rsi_buy:
                    signals.append((i, "BUY"))
                elif rsi[i] > req.rsi_sell and rsi[i - 1] <= req.rsi_sell:
                    signals.append((i, "SELL"))

        elif req.strategy == "MACD_SIGNAL":
            macd_line, signal_line = _compute_macd(closes)
            for i in range(27, len(closes)):
                if macd_line[i] > signal_line[i] and macd_line[i - 1] <= signal_line[i - 1]:
                    signals.append((i, "BUY"))
                elif macd_line[i] < signal_line[i] and macd_line[i - 1] >= signal_line[i - 1]:
                    signals.append((i, "SELL"))

        # Simulate trades
        capital = req.initial_capital
        position = 0  # shares held
        entry_price = 0.0
        trades = []
        equity_curve = []

        for i in range(len(closes)):
            portfolio_value = capital + position * closes[i]
            equity_curve.append({"date": dates[i], "value": round(portfolio_value, 2), "price": round(closes[i], 2)})

        for idx, action in signals:
            price = closes[idx]
            if action == "BUY" and position == 0 and capital > 0:
                shares = int(capital // price)
                if shares > 0:
                    position = shares
                    entry_price = price
                    capital -= shares * price
                    trades.append({
                        "date": dates[idx], "action": "BUY", "price": round(price, 2),
                        "shares": shares, "value": round(shares * price, 2)
                    })
            elif action == "SELL" and position > 0:
                sell_value = position * price
                pnl = (price - entry_price) * position
                capital += sell_value
                trades.append({
                    "date": dates[idx], "action": "SELL", "price": round(price, 2),
                    "shares": position, "value": round(sell_value, 2),
                    "pnl": round(pnl, 2), "pnl_pct": round((price - entry_price) / entry_price * 100, 2)
                })
                position = 0

        # Recalculate equity curve with actual trades
        capital_track = req.initial_capital
        pos_track = 0
        equity_curve = []
        for i in range(len(closes)):
            # Check if any trade happens at this index
            for idx, action in signals:
                if idx == i:
                    if action == "BUY" and pos_track == 0 and capital_track > 0:
                        shares = int(capital_track // closes[i])
                        if shares > 0:
                            pos_track = shares
                            closes[i]
                            capital_track -= shares * closes[i]
                    elif action == "SELL" and pos_track > 0:
                        capital_track += pos_track * closes[i]
                        pos_track = 0
            portfolio_value = capital_track + pos_track * closes[i]
            equity_curve.append({"date": dates[i], "value": round(portfolio_value, 2)})

        # Final metrics
        final_value = capital + position * closes[-1]
        total_return = ((final_value - req.initial_capital) / req.initial_capital) * 100
        buy_hold_return = ((closes[-1] - closes[0]) / closes[0]) * 100

        # Win rate
        winning = [t for t in trades if t.get("pnl", 0) > 0]
        sell_trades = [t for t in trades if t["action"] == "SELL"]
        win_rate = (len(winning) / len(sell_trades) * 100) if sell_trades else 0

        # Max drawdown from equity curve
        peak = 0
        max_dd = 0
        for pt in equity_curve:
            if pt["value"] > peak:
                peak = pt["value"]
            dd = (peak - pt["value"]) / peak * 100 if peak > 0 else 0
            if dd > max_dd:
                max_dd = dd

        # Sharpe ratio (annualized, simplified)
        if len(equity_curve) > 1:
            returns = []
            for i in range(1, len(equity_curve)):
                prev_val = equity_curve[i - 1]["value"]
                if prev_val > 0:
                    returns.append((equity_curve[i]["value"] - prev_val) / prev_val)
            if returns:
                avg_r = sum(returns) / len(returns)
                std_r = (sum((r - avg_r) ** 2 for r in returns) / len(returns)) ** 0.5
                sharpe = (avg_r / std_r * (252 ** 0.5)) if std_r > 0 else 0
            else:
                sharpe = 0
        else:
            sharpe = 0

        return {
            "status": "success",
            "symbol": req.symbol,
            "strategy": req.strategy,
            "period": req.period,
            "metrics": {
                "initial_capital": req.initial_capital,
                "final_value": round(final_value, 2),
                "total_return_pct": round(total_return, 2),
                "buy_hold_return_pct": round(buy_hold_return, 2),
                "total_trades": len(trades),
                "win_rate": round(win_rate, 1),
                "max_drawdown_pct": round(max_dd, 2),
                "sharpe_ratio": round(sharpe, 2),
            },
            "trades": trades[-20:],  # last 20 trades
            "equity_curve": equity_curve[::max(1, len(equity_curve) // 100)],  # downsample to ~100 points
        }

    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}
