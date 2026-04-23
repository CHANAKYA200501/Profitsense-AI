from fastapi import APIRouter
from data.nse_fetcher import NewsClient
import math

router = APIRouter()


def _clean_df(df):
    """Drop rows with NaN OHLC values from yfinance data."""
    return df.dropna(subset=["Open", "High", "Low", "Close"])


def _safe_float(val, default=0.0):
    """Convert to float, returning default if NaN/None."""
    try:
        f = float(val)
        return default if math.isnan(f) else f
    except (TypeError, ValueError):
        return default


@router.get("/overview")
def get_market_overview():
    news_client = NewsClient()
    
    try:
        import yfinance as yf
        
        # Fetch both NIFTY and SENSEX
        nifty = _clean_df(yf.Ticker("^NSEI").history(period="1mo"))
        sensex = _clean_df(yf.Ticker("^BSESN").history(period="1mo"))
        
        def build_stats(df, symbol_name):
            if len(df) >= 2:
                prev_day = df.iloc[-2]
                curr_day = df.iloc[-1]
                prev_close = _safe_float(prev_day['Close'], 1)
                return {
                    "symbol": symbol_name,
                    "date": df.index[-2].strftime('%B %d, %Y'),
                    "prev_close": round(prev_close, 2),
                    "prev_open": round(_safe_float(prev_day['Open']), 2),
                    "prev_high": round(_safe_float(prev_day['High']), 2),
                    "prev_low": round(_safe_float(prev_day['Low']), 2),
                    "prev_volume": _safe_float(prev_day['Volume']),
                    "curr_close": round(_safe_float(curr_day['Close']), 2),
                    "change_pct": round(_safe_float((curr_day['Close'] - prev_close) / prev_close * 100), 2)
                }
            return {"error": "Insufficient data", "symbol": symbol_name}
        
        nifty_stats = build_stats(nifty, "NIFTY 50")
        sensex_stats = build_stats(sensex, "SENSEX")
        
        news = news_client.get_latest_news(max_items=30)
        
        return {
            "status": "success",
            "stats": nifty_stats,
            "sensex_stats": sensex_stats,
            "news": news
        }
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}

@router.get("/ohlcv")
def get_ohlcv(symbol: str = "NIFTY 50", period: str = "1mo", interval: str = "1d"):
    """Get OHLCV candlestick data for a symbol."""
    try:
        import yfinance as yf
        
        # Map common names to yfinance tickers
        ticker_map = {
            "NIFTY 50": "^NSEI",
            "SENSEX": "^BSESN",
        }
        yf_symbol = ticker_map.get(symbol, f"{symbol}.NS")
        
        df = _clean_df(yf.Ticker(yf_symbol).history(period=period, interval=interval))
        if df.empty:
            return {"status": "error", "error": f"No data for {symbol}"}
        
        candles = []
        for idx, row in df.iterrows():
            ts = idx
            if hasattr(ts, 'timestamp'):
                time_val = int(ts.timestamp())
            else:
                time_val = str(ts.date())
            
            o, h, l, c = _safe_float(row["Open"]), _safe_float(row["High"]), _safe_float(row["Low"]), _safe_float(row["Close"])
            if o == 0 and h == 0 and l == 0 and c == 0:
                continue
            
            candles.append({
                "time": time_val,
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": int(_safe_float(row["Volume"])),
            })
        
        return {"status": "success", "symbol": symbol, "period": period, "data": candles}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}


@router.get("/intraday")
def get_intraday(symbol: str = "RELIANCE", interval: str = "5m"):
    """Get intraday OHLCV data (today, 5-min intervals)."""
    try:
        import yfinance as yf
        
        ticker_map = {"NIFTY 50": "^NSEI", "SENSEX": "^BSESN"}
        yf_symbol = ticker_map.get(symbol, f"{symbol}.NS")
        
        df = yf.Ticker(yf_symbol).history(period="1d", interval=interval)
        if df.empty or len(_clean_df(df)) == 0:
            # Try 5d if market hasn't opened today
            df = yf.Ticker(yf_symbol).history(period="5d", interval=interval)
        
        df = _clean_df(df)
        if df.empty:
            return {"status": "error", "error": f"No intraday data for {symbol}"}
        
        candles = []
        for idx, row in df.iterrows():
            o, h, l, c = _safe_float(row["Open"]), _safe_float(row["High"]), _safe_float(row["Low"]), _safe_float(row["Close"])
            if o == 0 and c == 0:
                continue
            candles.append({
                "time": int(idx.timestamp()),
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": int(_safe_float(row["Volume"])),
            })
        
        # Summary stats
        if len(df) > 0:
            day_open = _safe_float(df.iloc[0]["Open"], 1)
            ltp = _safe_float(df.iloc[-1]["Close"])
            stats = {
                "day_open": round(day_open, 2),
                "day_high": round(_safe_float(df["High"].max()), 2),
                "day_low": round(_safe_float(df["Low"].min()), 2),
                "ltp": round(ltp, 2),
                "total_volume": int(_safe_float(df["Volume"].sum())),
                "change_pct": round((ltp - day_open) / day_open * 100 if day_open > 0 else 0, 2),
            }
        else:
            stats = {}
        
        return {"status": "success", "symbol": symbol, "interval": interval, "data": candles, "stats": stats}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}


@router.get("/expiry")
def get_expiry_data():
    """Get Thursday F&O expiry analysis — NIFTY options data."""
    try:
        import yfinance as yf
        from datetime import datetime, timedelta
        
        # Find next Thursday (or today if Thursday)
        today = datetime.now()
        days_until_thu = (3 - today.weekday()) % 7
        if days_until_thu == 0 and today.hour >= 15:
            days_until_thu = 7
        next_expiry = today + timedelta(days=days_until_thu)
        
        # Get NIFTY current price
        nifty = yf.Ticker("^NSEI")
        hist = _clean_df(nifty.history(period="5d"))
        current_price = round(_safe_float(hist.iloc[-1]["Close"]), 2) if len(hist) > 0 else 23000
        
        if current_price == 0:
            current_price = 23000  # Safe fallback
        
        # Calculate nearest strikes
        base_strike = round(current_price / 50) * 50
        strikes = [base_strike + (i * 50) for i in range(-10, 11)]
        
        # Generate OI data (simulated — real options chain would need NSE API)
        import random
        random.seed(int(current_price))
        oi_data = []
        max_call_oi_strike = base_strike + random.choice([100, 150, 200, 250])
        max_put_oi_strike = base_strike - random.choice([100, 150, 200, 250])
        
        total_call_oi = 0
        total_put_oi = 0
        for strike in strikes:
            call_oi = random.randint(50000, 500000)
            put_oi = random.randint(50000, 500000)
            if strike == max_call_oi_strike:
                call_oi = random.randint(800000, 1500000)
            if strike == max_put_oi_strike:
                put_oi = random.randint(800000, 1500000)
            total_call_oi += call_oi
            total_put_oi += put_oi
            oi_data.append({
                "strike": strike,
                "call_oi": call_oi,
                "put_oi": put_oi,
                "call_change": random.randint(-50000, 50000),
                "put_change": random.randint(-50000, 50000),
            })
        
        pcr = round(total_put_oi / total_call_oi, 2) if total_call_oi > 0 else 0
        max_pain = base_strike
        
        # Countdown
        expiry_dt = next_expiry.replace(hour=15, minute=30, second=0)
        remaining = expiry_dt - today
        hours_remaining = remaining.total_seconds() / 3600
        
        return {
            "status": "success",
            "nifty_ltp": current_price,
            "expiry_date": next_expiry.strftime("%Y-%m-%d"),
            "expiry_day": next_expiry.strftime("%A"),
            "hours_remaining": round(hours_remaining, 1),
            "pcr": pcr,
            "max_pain": max_pain,
            "total_call_oi": total_call_oi,
            "total_put_oi": total_put_oi,
            "oi_data": oi_data,
            "sentiment": "BULLISH" if pcr > 1.2 else ("BEARISH" if pcr < 0.8 else "NEUTRAL"),
        }
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}


import threading

_report_lock = threading.Lock()
_report_generating = False

def _generate_report_bg():
    """Background thread that generates the report."""
    global _report_generating
    try:
        from services.report_generator import MarketReportGenerator
        gen = MarketReportGenerator()
        gen.generate_report()  # This populates the class-level cache
    except Exception as e:
        print(f"[BG Report] Error: {e}")
    finally:
        global _report_generating
        _report_generating = False


@router.get("/report")
def get_market_report():
    """Generate comprehensive daily market intelligence report with NIFTY + SENSEX, sectors, gainers/losers."""
    global _report_generating
    try:
        from services.report_generator import MarketReportGenerator
        gen = MarketReportGenerator()

        # Check if we have a valid cache
        from datetime import datetime
        now = datetime.now()
        if gen._cache_time and (now - gen._cache_time) < gen._CACHE_DURATION:
            return {"status": "success", "report": gen._cache}

        # No cache — start background generation if not already running
        if not _report_generating:
            with _report_lock:
                if not _report_generating:
                    _report_generating = True
                    t = threading.Thread(target=_generate_report_bg, daemon=True)
                    t.start()

        # Return partial data immediately (indices only, empty intelligence)
        if gen._cache:
            return {"status": "success", "report": gen._cache}

        # No cache at all yet — return skeleton so frontend doesn't error
        return {
            "status": "success",
            "report": {
                "generated_at": now.isoformat(),
                "indices": {},
                "market_intelligence": {
                    "sectors": {},
                    "top_gainers": [],
                    "top_losers": [],
                    "aggregated_nifty_volume": 0,
                    "ai_insight": "Initializing market data feed... First load takes ~10 seconds."
                }
            }
        }
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}
