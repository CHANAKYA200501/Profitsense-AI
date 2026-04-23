from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import yfinance as yf
from datetime import datetime, timedelta
import math

router = APIRouter()

# ─── Helper: Safe float ──────────────────────────────────────────────────
def sf(v, default=0.0):
    try:
        f = float(v)
        return default if math.isnan(f) else f
    except:
        return default

# ─── Technical Analysis Engine ───────────────────────────────────────────
def compute_technicals(closes: list, highs: list, lows: list, volumes: list):
    c = closes
    if len(c) < 20:
        return {}
    # RSI-14
    deltas = [c[i] - c[i-1] for i in range(1, len(c))]
    gains = [d if d > 0 else 0 for d in deltas[-14:]]
    losses = [-d if d < 0 else 0 for d in deltas[-14:]]
    avg_gain = sum(gains) / 14 if gains else 0.001
    avg_loss = sum(losses) / 14 if losses else 0.001
    rs = avg_gain / avg_loss if avg_loss > 0 else 100
    rsi = round(100 - (100 / (1 + rs)), 1)

    # EMA
    def ema(data, p):
        if len(data) < p:
            return sf(data[-1])
        e = sum(data[:p]) / p
        m = 2 / (p + 1)
        for x in data[p:]:
            e = (x - e) * m + e
        return round(e, 2)

    ema20 = ema(c, 20)
    ema50 = ema(c, min(50, len(c)))
    ema12 = ema(c, 12)
    ema26 = ema(c, 26)
    macd_val = round(ema12 - ema26, 2)

    # ATR-14
    tr_list = []
    for i in range(max(1, len(highs) - 14), len(highs)):
        h, l, pc = highs[i], lows[i], closes[i - 1]
        tr_list.append(max(h - l, abs(h - pc), abs(l - pc)))
    atr = round(sum(tr_list) / len(tr_list), 2) if tr_list else 0

    # Support / Resistance
    recent_highs = highs[-20:]
    recent_lows = lows[-20:]
    resistance = round(max(recent_highs), 2) if recent_highs else 0
    support = round(min(recent_lows), 2) if recent_lows else 0

    # Volume trend
    avg_vol_20 = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else 1
    current_vol = volumes[-1]
    vol_signal = "HIGH" if current_vol > avg_vol_20 * 1.5 else ("LOW" if current_vol < avg_vol_20 * 0.7 else "NORMAL")

    return {
        "rsi_14": rsi,
        "macd": macd_val,
        "macd_signal": round(macd_val * 0.8, 2),
        "macd_histogram": round(macd_val * 0.2, 2),
        "ema_20": ema20,
        "ema_50": ema50,
        "atr_14": atr,
        "support": support,
        "resistance": resistance,
        "current_price": round(c[-1], 2),
        "volume_signal": vol_signal,
        "above_ema20": c[-1] > ema20,
        "above_ema50": c[-1] > ema50,
        "golden_cross": ema20 > ema50,
    }


# ─── News Sentiment (keyword-based, no external NLP dep) ─────────────────
def get_news_sentiment(symbol: str):
    try:
        import feedparser, requests
        aliases = {
            'RELIANCE': ['Reliance', 'RIL'],
            'TCS': ['TCS', 'Tata Consultancy'],
            'HDFCBANK': ['HDFC Bank'],
            'INFY': ['Infosys', 'Infy'],
            'ICICIBANK': ['ICICI Bank'],
            'SBIN': ['SBI', 'State Bank'],
            'ITC': ['ITC'],
            'BHARTIARTL': ['Airtel', 'Bharti'],
        }
        names = aliases.get(symbol, [symbol])
        positive_kw = ['growth', 'profit', 'surge', 'rally', 'beat', 'strong', 'gain', 'record', 'upgrade', 'positive', 'bull', 'buy', 'outperform']
        negative_kw = ['loss', 'fall', 'decline', 'slump', 'miss', 'weak', 'drop', 'sell', 'downgrade', 'negative', 'bear', 'concern', 'risk']

        feeds = [
            'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
            'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
        ]
        news_items = []
        pos_score = 0
        neg_score = 0
        for url in feeds:
            try:
                r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
                feed = feedparser.parse(r.content)
                for entry in feed.entries[:15]:
                    text = (entry.title + ' ' + entry.get('summary', '')).lower()
                    if any(n.lower() in text for n in names):
                        item = {
                            'title': entry.title,
                            'link': entry.link,
                            'published': entry.get('published', ''),
                        }
                        news_items.append(item)
                        for kw in positive_kw:
                            if kw in text:
                                pos_score += 1
                        for kw in negative_kw:
                            if kw in text:
                                neg_score += 1
            except:
                pass

        if not news_items:
            return {'sentiment': 'NEUTRAL', 'score': 0, 'items': [], 'summary': 'No recent news found for this stock.'}

        total = pos_score + neg_score
        if total == 0:
            sentiment = 'NEUTRAL'
            score = 50
        else:
            score = round((pos_score / total) * 100)
            sentiment = 'POSITIVE' if score >= 60 else ('NEGATIVE' if score <= 40 else 'NEUTRAL')

        summary_map = {
            'POSITIVE': f'News sentiment is bullish. {pos_score} positive signals detected — potential tailwind for price.',
            'NEGATIVE': f'News sentiment is bearish. {neg_score} negative signals detected — proceed with caution.',
            'NEUTRAL': 'Mixed or neutral news sentiment. No strong directional bias from recent headlines.',
        }
        return {
            'sentiment': sentiment,
            'score': score,
            'items': news_items[:5],
            'summary': summary_map[sentiment],
        }
    except Exception as e:
        return {'sentiment': 'NEUTRAL', 'score': 50, 'items': [], 'summary': f'Could not fetch news: {e}'}


# ─── Price Forecasting (momentum + linear extrapolation) ─────────────────
def forecast_prices(closes: list, days_list=[5, 10, 30]):
    results = {}
    if len(closes) < 30:
        for d in days_list:
            results[d] = {'low': round(closes[-1] * 0.97, 2), 'mid': round(closes[-1], 2), 'high': round(closes[-1] * 1.03, 2)}
        return results

    # Linear regression on last 30 days
    n = 30
    x = list(range(n))
    y = closes[-n:]
    x_mean = sum(x) / n
    y_mean = sum(y) / n
    num = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
    den = sum((x[i] - x_mean) ** 2 for i in range(n))
    slope = num / den if den else 0
    intercept = y_mean - slope * x_mean
    std_dev = (sum((y[i] - (slope * x[i] + intercept)) ** 2 for i in range(n)) / n) ** 0.5

    # Momentum factor (last 5 vs last 20)
    mom_5 = (closes[-1] - closes[-5]) / closes[-5] * 100 if len(closes) >= 5 else 0
    mom_20 = (closes[-1] - closes[-20]) / closes[-20] * 100 if len(closes) >= 20 else 0
    momentum_adj = 1 + (mom_5 * 0.3 + mom_20 * 0.1) / 100

    for d in days_list:
        projected = (slope * (n + d) + intercept) * momentum_adj
        uncertainty = std_dev * (d / 10) ** 0.5
        results[d] = {
            'low': round(max(projected - uncertainty, projected * 0.93), 2),
            'mid': round(projected, 2),
            'high': round(min(projected + uncertainty, projected * 1.07), 2),
        }
    return results


# ─── AI Decision Engine ───────────────────────────────────────────────────
def make_decision(tech: dict, news: dict, buy_price: float, current_price: float, holding_days: int):
    score = 0
    reasons = []

    rsi = tech.get('rsi_14', 50)
    macd = tech.get('macd', 0)
    above_ema20 = tech.get('above_ema20', False)
    tech.get('above_ema50', False)
    golden_cross = tech.get('golden_cross', False)
    resistance = tech.get('resistance', current_price * 1.05)
    tech.get('atr_14', current_price * 0.02)
    pnl_pct = ((current_price - buy_price) / buy_price * 100) if buy_price > 0 else 0

    # RSI signals
    if rsi < 35:
        score += 2
        reasons.append(f"RSI at {rsi} — oversold, potential reversal to upside.")
    elif rsi > 70:
        score -= 2
        reasons.append(f"RSI at {rsi} — overbought, caution advised.")
    else:
        reasons.append(f"RSI at {rsi} — neutral range, momentum balanced.")

    # MACD
    if macd > 0:
        score += 1
        reasons.append("MACD bullish — positive crossover signal.")
    else:
        score -= 1
        reasons.append("MACD bearish — downward momentum.")

    # EMA
    if above_ema20:
        score += 1
        reasons.append("Price above EMA-20 — short-term uptrend intact.")
    else:
        score -= 1
        reasons.append("Price below EMA-20 — short-term weakness.")
    if golden_cross:
        score += 1
        reasons.append("Golden cross detected (EMA-20 > EMA-50) — medium-term bullish.")

    # News
    news_sentiment = news.get('sentiment', 'NEUTRAL')
    if news_sentiment == 'POSITIVE':
        score += 2
        reasons.append(f"Positive news sentiment ({news.get('score', 50)}%) — fundamental tailwind.")
    elif news_sentiment == 'NEGATIVE':
        score -= 2
        reasons.append(f"Negative news sentiment ({news.get('score', 50)}%) — fundamental headwind.")

    # Near resistance
    if resistance > 0 and current_price >= resistance * 0.97:
        score -= 1
        reasons.append(f"Price near resistance ₹{resistance} — potential distribution zone.")

    # Profit protection
    if pnl_pct >= 15:
        score -= 1
        reasons.append(f"Already up {pnl_pct:.1f}% — consider booking partial profits.")
    elif pnl_pct <= -10:
        score -= 2
        reasons.append(f"Down {abs(pnl_pct):.1f}% from cost — review stop-loss discipline.")

    # Decision
    if score >= 3:
        decision = "BUY MORE"
        confidence = min(95, 60 + score * 8)
        risk = "MEDIUM"
        explanation = (
            f"Strong bullish confluence detected. RSI, MACD, and trend are aligned upward. "
            f"{news_sentiment.title()} news sentiment adds confidence. "
            f"Consider adding to your position on any minor pullback toward ₹{tech.get('ema_20', current_price):.0f} (EMA-20 support)."
        )
    elif score >= 1:
        decision = "HOLD"
        confidence = min(85, 55 + score * 6)
        risk = "LOW"
        explanation = (
            f"Trend is intact but momentum is moderate. RSI at {rsi} is not extreme. "
            f"Hold your position with a stop-loss below ₹{tech.get('support', current_price * 0.95):.0f} (support). "
            f"News sentiment is {news_sentiment.lower()} — no immediate catalyst to exit."
        )
    elif score >= -1:
        decision = "HOLD"
        confidence = 50
        risk = "MEDIUM"
        explanation = (
            f"Mixed signals. {rsi} RSI and {macd} MACD suggest consolidation. "
            f"Hold with tight stop-loss. Re-evaluate after next 5 days of price action."
        )
    else:
        decision = "SELL"
        confidence = min(90, 55 + abs(score) * 7)
        risk = "HIGH"
        explanation = (
            f"Bearish confluence — MACD negative, price below EMA-20, and RSI momentum fading. "
            f"{news_sentiment.title()} sentiment adds downside risk. "
            f"Consider exiting at current levels and protecting capital."
        )

    return {
        'decision': decision,
        'confidence': round(confidence),
        'risk_level': risk,
        'score': score,
        'explanation': explanation,
        'reasons': reasons,
    }


# ─── Pydantic Models ─────────────────────────────────────────────────────
class TradeAdvisorRequest(BaseModel):
    symbol: str
    buy_date: str           # "YYYY-MM-DD"
    buy_price: Optional[float] = None
    quantity: Optional[int] = 1
    sell_date: Optional[str] = None   # optional, for P&L simulation


class ProfitCalcRequest(BaseModel):
    symbol: str
    buy_date: str
    sell_date: str
    buy_price: Optional[float] = None
    quantity: Optional[int] = 1


# ─── Endpoints ─────────────────────────────────────────────────────────
@router.post("/analyze/trade")
async def analyze_trade(req: TradeAdvisorRequest):
    """
    Core trade advisor: accepts buy info, returns AI decision, technicals,
    forecasts, news sentiment, and multi-scenario analysis.
    """
    symbol = req.symbol.upper().strip()
    try:
        ticker = yf.Ticker(f"{symbol}.NS")
        df = ticker.history(period="6mo", interval="1d")
        df = df.dropna(subset=["Open", "High", "Low", "Close"])
    except Exception as e:
        return {"status": "error", "message": f"Failed to fetch data for {symbol}: {e}"}

    if df.empty or len(df) < 20:
        return {"status": "error", "message": f"Insufficient historical data for {symbol}."}

    closes = [sf(v) for v in df['Close'].values if sf(v) > 0]
    highs = [sf(v) for v in df['High'].values if sf(v) > 0]
    lows = [sf(v) for v in df['Low'].values if sf(v) > 0]
    volumes = [sf(v, 0) for v in df['Volume'].values]
    current_price = closes[-1]

    # Auto-fetch buy price if not provided
    buy_price = req.buy_price
    if not buy_price or buy_price <= 0:
        try:
            buy_dt = datetime.strptime(req.buy_date, "%Y-%m-%d")
            historical = ticker.history(
                start=buy_dt.strftime("%Y-%m-%d"),
                end=(buy_dt + timedelta(days=5)).strftime("%Y-%m-%d")
            )
            if not historical.empty:
                buy_price = sf(historical['Close'].iloc[0])
        except:
            buy_price = current_price

    holding_days = (datetime.now() - datetime.strptime(req.buy_date, "%Y-%m-%d")).days
    pnl_absolute = round((current_price - buy_price) * (req.quantity or 1), 2)
    pnl_pct = round(((current_price - buy_price) / buy_price) * 100, 2) if buy_price else 0
    annual_factor = 365 / holding_days if holding_days > 0 else 1
    cagr = round(((current_price / buy_price) ** annual_factor - 1) * 100, 2) if buy_price and holding_days > 0 else 0

    # Technical analysis
    tech = compute_technicals(closes, highs, lows, volumes)

    # News sentiment
    news = get_news_sentiment(symbol)

    # AI Decision
    ai = make_decision(tech, news, buy_price, current_price, holding_days)

    # Price forecasting
    forecasts = forecast_prices(closes, [5, 10, 30])

    # Optimal sell window suggestion
    best_window = "5-10 days"
    expected_target = round(current_price * 1.05, 2)
    if ai['decision'] == 'BUY MORE':
        best_window = "10-20 days"
        expected_target = forecasts[10]['high']
    elif ai['decision'] == 'SELL':
        best_window = "Immediate"
        expected_target = current_price
    else:
        best_window = "7-14 days"
        expected_target = forecasts[10]['mid']

    # Multi-scenario analysis
    scenarios = []
    for label, days in [("Sell Today", 0), ("Hold 5 Days", 5), ("Hold 10 Days", 10), ("Hold 30 Days", 30)]:
        if days == 0:
            price_mid = current_price
            price_low = current_price * 0.99
            price_high = current_price * 1.01
        else:
            f = forecasts[days]
            price_mid = f['mid']
            price_low = f['low']
            price_high = f['high']

        profit_low = round((price_low - buy_price) * (req.quantity or 1), 2)
        profit_mid = round((price_mid - buy_price) * (req.quantity or 1), 2)
        profit_high = round((price_high - buy_price) * (req.quantity or 1), 2)
        pct_mid = round(((price_mid - buy_price) / buy_price) * 100, 2) if buy_price else 0

        scenarios.append({
            "label": label,
            "days": days,
            "price_low": price_low,
            "price_mid": price_mid,
            "price_high": price_high,
            "profit_low": profit_low,
            "profit_mid": profit_mid,
            "profit_high": profit_high,
            "return_pct": pct_mid,
        })

    # Risk management
    stop_loss = round(current_price - (tech.get('atr_14', current_price * 0.02) * 2), 2)
    target_price = round(current_price + (tech.get('atr_14', current_price * 0.02) * 3), 2)
    risk_reward = round((target_price - current_price) / (current_price - stop_loss), 2) if current_price > stop_loss else 0

    return {
        "status": "success",
        "symbol": symbol,
        "current_price": current_price,
        "buy_price": buy_price,
        "buy_date": req.buy_date,
        "holding_days": holding_days,
        "quantity": req.quantity or 1,
        "pnl": {
            "absolute": pnl_absolute,
            "percent": pnl_pct,
            "cagr": cagr,
        },
        "ai_decision": ai,
        "technical_analysis": tech,
        "news_sentiment": news,
        "forecast": {
            "best_sell_window": best_window,
            "expected_target": expected_target,
            "price_5d": forecasts[5],
            "price_10d": forecasts[10],
            "price_30d": forecasts[30],
        },
        "scenarios": scenarios,
        "risk_management": {
            "stop_loss": stop_loss,
            "target": target_price,
            "risk_reward_ratio": risk_reward,
            "atr": tech.get('atr_14', 0),
        },
        "disclaimer": "⚠️ This is AI-generated analysis for educational purposes only. NOT financial advice.",
    }


@router.post("/profit/calculate")
async def calculate_profit(req: ProfitCalcRequest):
    """Calculate P&L between two dates."""
    symbol = req.symbol.upper().strip()
    try:
        buy_dt = datetime.strptime(req.buy_date, "%Y-%m-%d")
        sell_dt = datetime.strptime(req.sell_date, "%Y-%m-%d")
        ticker = yf.Ticker(f"{symbol}.NS")

        buy_data = ticker.history(
            start=req.buy_date,
            end=(buy_dt + timedelta(days=5)).strftime("%Y-%m-%d")
        )
        sell_data = ticker.history(
            start=req.sell_date,
            end=(sell_dt + timedelta(days=5)).strftime("%Y-%m-%d")
        )

        buy_price = req.buy_price if (req.buy_price and req.buy_price > 0) else (sf(buy_data['Close'].iloc[0]) if not buy_data.empty else 0)
        sell_price = sf(sell_data['Close'].iloc[0]) if not sell_data.empty else 0

        if buy_price == 0 or sell_price == 0:
            return {"status": "error", "message": "Could not fetch prices for the given dates."}

        qty = req.quantity or 1
        holding_days = (sell_dt - buy_dt).days
        pnl_abs = round((sell_price - buy_price) * qty, 2)
        pnl_pct = round(((sell_price - buy_price) / buy_price) * 100, 2)
        annual_factor = 365 / holding_days if holding_days > 0 else 1
        cagr = round(((sell_price / buy_price) ** annual_factor - 1) * 100, 2)

        return {
            "status": "success",
            "symbol": symbol,
            "buy_date": req.buy_date,
            "sell_date": req.sell_date,
            "buy_price": buy_price,
            "sell_price": sell_price,
            "quantity": qty,
            "holding_days": holding_days,
            "pnl_absolute": pnl_abs,
            "pnl_percent": pnl_pct,
            "cagr": cagr,
            "outcome": "PROFIT" if pnl_abs >= 0 else "LOSS",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
