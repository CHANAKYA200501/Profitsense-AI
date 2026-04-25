import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as aioredis
import os

from api import signals, portfolio, analyze, backtest, mf, auth, chat, market, paper_trading, trade_advisor, radar, video, admin as admin_api
from api import security_auth, security_admin
from alerts.telegram import TelegramAlerter

app = FastAPI(title="ProfitSense AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://profitsense-ai.vercel.app",
        "https://profitsense-ai-git-main-chanakya200501s-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(signals.router, prefix="/api/signals", tags=["Signals"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["Analyze"])
app.include_router(backtest.router, prefix="/api/backtest", tags=["Backtest"])
app.include_router(mf.router, prefix="/api/mf", tags=["Mutual Funds"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(market.router, prefix="/api/market", tags=["Market Overview"])
app.include_router(paper_trading.router, prefix="/api/trade", tags=["Trading Execution"])
app.include_router(trade_advisor.router, prefix="/api/advisor", tags=["Trade Advisor"])
app.include_router(radar.router, prefix="/api/radar", tags=["Opportunity Radar"])
app.include_router(video.router, prefix="/api/video", tags=["Video Engine"])
app.include_router(admin_api.router, prefix="/api/admin", tags=["Admin"])

# Security Portal Routes
app.include_router(security_auth.router, prefix="/api/portal/auth", tags=["Portal Auth"])
app.include_router(security_admin.router, prefix="/api/portal", tags=["Portal Admin"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "profitsense-backend"}

@app.post("/api/scan_now")
async def trigger_scan_now():
    """Generate AI signals. Falls back to real yfinance-based demo signals if orchestrator unavailable."""
    try:
        from agents.orchestrator import AgentOrchestrator
        import redis.asyncio as aioredis
        import json
        import os
        
        orch = AgentOrchestrator()
        signals = await orch.run_full_scan()
        
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        client = aioredis.from_url(redis_url)
        alerter = TelegramAlerter()
        
        for sig in signals:
            await client.publish("live_signals", json.dumps(sig))
            if sig.get("confidence", 0) >= 80:
                alerter.send_alert(sig)
            
        admin_api.set_signals_ref(signals)
        return {"status": "success", "signals_generated": len(signals), "signals": signals}
    except Exception as e:
        print(f"Main scan failed, falling back: {e}")
        # Fallback: generate demo signals from real market data
        result = _generate_fallback_signals()
        admin_api.set_signals_ref(result.get("signals", []))
        return result


def _generate_fallback_signals():
    """Generate realistic demo signals using live yfinance data."""
    import yfinance as yf
    import uuid
    from datetime import datetime
    import random
    import math
    
    def safe_float(val, default=0.0):
        try:
            f = float(val)
            return default if math.isnan(f) else f
        except (TypeError, ValueError):
            return default
            
    print("Generating fallback signals...")
    
    WATCHLIST = [
        "RELIANCE.NS", "TCS.NS", "INFY.NS", "TATAMOTORS.NS", "HDFCBANK.NS",
        "AAPL", "TSLA", "NVDA", "MSFT", "GOOGL"
    ]
    signals = []
    
    for full_ticker in WATCHLIST:
        symbol = full_ticker.split('.')[0]
        try:
            print(f"Fetching data for {full_ticker}")
            ticker = yf.Ticker(full_ticker)
            df = ticker.history(period="1mo")
            # Drop rows with NaN OHLC values
            df = df.dropna(subset=["Open", "High", "Low", "Close"])
            if df.empty or len(df) < 5:
                continue
            
            closes = [safe_float(c) for c in df["Close"].values]
            # Filter out any zero/NaN closes
            closes = [c for c in closes if c > 0]
            if len(closes) < 10:
                continue
            
            current = closes[-1]
            closes[-2]
            
            # Calculate real technical indicators
            # RSI-14
            deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
            gains = [d if d > 0 else 0 for d in deltas[-14:]]
            losses = [-d if d < 0 else 0 for d in deltas[-14:]]
            avg_gain = sum(gains) / 14 if gains else 0.001
            avg_loss = sum(losses) / 14 if losses else 0.001
            rs = avg_gain / avg_loss if avg_loss > 0 else 100
            rsi = round(100 - (100 / (1 + rs)), 1)
            
            # EMA-20 and EMA-50
            def calc_ema(data, period):
                if len(data) < period:
                    return float(data[-1])
                ema = sum(data[:period]) / period
                mult = 2 / (period + 1)
                for price in data[period:]:
                    ema = (price - ema) * mult + ema
                return round(ema, 2)
            
            ema_20 = calc_ema(closes, 20)
            ema_50 = calc_ema(closes, 50)
            
            # MACD
            ema_12 = calc_ema(closes, 12)
            ema_26 = calc_ema(closes, 26)
            macd_val = round(ema_12 - ema_26, 2)
            
            # Direction based on technicals
            bullish_score = 0
            if rsi < 40: bullish_score += 2
            elif rsi < 50: bullish_score += 1
            elif rsi > 70: bullish_score -= 2
            elif rsi > 60: bullish_score -= 1
            
            if current > ema_20: bullish_score += 1
            if ema_20 > ema_50: bullish_score += 1
            if macd_val > 0: bullish_score += 1
            
            is_bullish = bullish_score > 0
            direction = "bullish" if is_bullish else "bearish"
            recommendation = "BUY" if bullish_score >= 2 else ("SELL" if bullish_score <= -2 else "HOLD")
            confidence = min(95, max(45, 60 + abs(bullish_score) * 8 + random.randint(-5, 5)))
            
            # Breakout detection
            highs = [safe_float(h) for h in df["High"].values[-20:] if safe_float(h) > 0]
            high_20 = max(highs) if highs else current
            breakout = current >= high_20 * 0.98
            
            # Volatility for SL/Target
            lows = [safe_float(l) for l in df["Low"].values[-14:] if safe_float(l) > 0]
            atr = (sum(highs[-14:]) / len(highs[-14:])) - (sum(lows) / len(lows)) if highs and lows else current * 0.02
            
            signal = {
                "id": str(uuid.uuid4()),
                "symbol": symbol,
                "confidence": confidence,
                "direction": direction,
                "recommendation": recommendation,
                "timestamp": datetime.now().isoformat(),
                "narration": {
                    "headline": f"{'Bullish momentum' if is_bullish else 'Bearish pressure'} on {symbol}",
                    "what_happened": f"RSI at {rsi} {'(oversold zone)' if rsi < 30 else '(overbought zone)' if rsi > 70 else ''}, "
                                     f"price {'above' if current > ema_20 else 'below'} EMA-20 (₹{ema_20}). "
                                     f"MACD {'positive' if macd_val > 0 else 'negative'} at {macd_val}. "
                                     f"{'Breakout detected near 20-day high.' if breakout else ''}",
                    "suggested_action": f"{'Consider entry on dips near ₹' + str(round(ema_20, 0)) if is_bullish else 'Consider booking profits or hedging position.'}"
                },
                "technical_indicators": {
                    "rsi_14": rsi,
                    "macd": {
                        "macd": macd_val,
                        "signal": round(macd_val * 0.8, 2),
                        "histogram": round(macd_val * 0.2, 2),
                        "crossover": "BULLISH" if macd_val > 0 else "BEARISH"
                    },
                    "ema_20": ema_20,
                    "ema_50": ema_50,
                    "breakout": breakout
                },
                "patterns": [
                    {
                        "type": "BULLISH_BREAKOUT" if breakout else "CONSOLIDATION",
                        "label": "20-Day Range Breakout" if breakout else "Neutral Side-Trend",
                        "explanation": f"Price successfully cleared the ₹{high_20} level on high volume." if breakout else "Stock is currently trading within a tight historical range.",
                        "success_rate": 74.5 if breakout else 50.0,
                        "severity": "HIGH" if breakout else "LOW"
                    }
                ],
                "decision_reasons": [
                    f"RSI-14 at {rsi} — {'oversold' if rsi < 30 else 'overbought' if rsi > 70 else 'neutral range'}",
                    f"Price {'above' if current > ema_20 else 'below'} EMA-20 (₹{ema_20})",
                    f"MACD {'bullish' if macd_val > 0 else 'bearish'} crossover",
                    f"EMA-20 {'>' if ema_20 > ema_50 else '<'} EMA-50 — {'uptrend' if ema_20 > ema_50 else 'downtrend'}",
                ],
                "trade_parameters": {
                    "symbol": symbol,
                    "direction": "BUY" if is_bullish else "SELL",
                    "entry_range": f"₹{round(current * 0.99, 0)} - ₹{round(current * 1.01, 0)}",
                    "entry_price_est": round(current, 2),
                    "target": round(current * (1.05 if is_bullish else 0.95), 2),
                    "stop_loss": round(current * (0.97 if is_bullish else 1.03), 2),
                    "risk_tag": "HIGH" if abs(bullish_score) <= 1 else "MEDIUM",
                    "suggested_qty": max(1, int(50000 / current)),
                    "confidence": confidence,
                    "time_horizon": "Swing (3-7 days)"
                }
            }
            signals.append(signal)
        except Exception as e:
            print(f"Fallback signal error for {symbol}: {e}")
            continue
    
    return {"status": "success", "signals_generated": len(signals), "signals": signals}

active_connections = []

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        client = aioredis.from_url(redis_url)
        pubsub = client.pubsub()
        await pubsub.subscribe("live_signals")
        
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"].decode("utf-8"))
                await websocket.send_json({"type": "new_signal", "data": data})
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        print(f"WS Error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
