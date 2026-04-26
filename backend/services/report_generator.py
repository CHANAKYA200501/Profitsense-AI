"""
Market Report Generator — Daily NIFTY + SENSEX intelligence reports.
Aggregates OHLCV data, computes technical indicators, and generates AI insights.
"""
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

class MarketReportGenerator:
    """Generates comprehensive daily reports for NIFTY 50 and BSE SENSEX."""

    INDICES = {
        'NIFTY 50':   '^NSEI',
        'SENSEX':     '^BSESN',
    }

    NIFTY_50_CONSTITUENTS = [
        'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
        'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'KOTAKBANK.NS',
        'LT.NS', 'AXISBANK.NS', 'MARUTI.NS',
        'SUNPHARMA.NS', 'WIPRO.NS',
        'HCLTECH.NS', 'NTPC.NS', 'TATAMOTORS.NS',
        'ADANIENT.NS', 'DRREDDY.NS',
        'JSWSTEEL.NS', 'TATASTEEL.NS',
        'COALINDIA.NS', 'ONGC.NS', 'TECHM.NS', 'HINDALCO.NS',
    ]

    SECTOR_MAP = {
        'Banking':  ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS'],
        'IT':       ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS'],
        'Auto':     ['MARUTI.NS', 'TATAMOTORS.NS'],
        'Pharma':   ['SUNPHARMA.NS', 'DRREDDY.NS'],
        'Energy':   ['RELIANCE.NS', 'NTPC.NS', 'ONGC.NS', 'COALINDIA.NS', 'ADANIENT.NS'],
        'FMCG':     ['HINDUNILVR.NS', 'ITC.NS'],
        'Metals':   ['TATASTEEL.NS', 'JSWSTEEL.NS', 'HINDALCO.NS'],
        'Infra':    ['LT.NS'],
    }

    _cache: dict = {}
    _cache_time: datetime | None = None
    _cache_date: str | None = None          # tracks which trading day the cache belongs to
    _CACHE_DURATION = timedelta(minutes=10)  # refresh every 10 min during market hours

    def _fetch_index(self, yf_symbol: str, period: str = '1mo') -> pd.DataFrame:
        t = yf.Ticker(yf_symbol)
        return t.history(period=period)

    def _compute_rsi(self, series: pd.Series, period: int = 14) -> float:
        delta = series.diff()
        gain = delta.where(delta > 0, 0.0).rolling(period).mean()
        loss = (-delta.where(delta < 0, 0.0)).rolling(period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return round(float(rsi.iloc[-1]), 2) if not rsi.empty else 50.0

    def _compute_ema(self, series: pd.Series, span: int) -> float:
        return round(float(series.ewm(span=span).mean().iloc[-1]), 2)

    def _trend_label(self, change_pct: float, rsi: float) -> str:
        if change_pct > 0.5 and rsi < 65:
            return 'BULLISH'
        elif change_pct < -0.5 and rsi > 35:
            return 'BEARISH'
        return 'SIDEWAYS'

    def _ai_insight(self, trend: str, top_sectors: list, rsi: float) -> str:
        if trend == 'BULLISH':
            return f"Market is bullish driven by strength in {', '.join(top_sectors[:2])} sectors. RSI at {rsi} suggests room for further upside."
        elif trend == 'BEARISH':
            return f"Weak sentiment with selling pressure across {', '.join(top_sectors[:2])} sectors. RSI at {rsi} nearing oversold territory."
        return f"Market trading sideways with mixed signals. RSI at {rsi} indicates neutral momentum. Wait for breakout confirmation."

    def generate_report(self) -> dict:
        """Generate the full daily market intelligence report with caching and parallel fetching."""
        now = datetime.now()
        today_str = now.strftime('%Y-%m-%d')

        # Invalidate cache if: time expired OR it's a new calendar day
        cache_expired = (
            self._cache_time is None or
            (now - self._cache_time) >= self._CACHE_DURATION or
            self._cache_date != today_str
        )
        if not cache_expired and self._cache:
            return self._cache

        report = {'generated_at': now.isoformat(), 'indices': {}}

        # 1. Fetch Core Indices
        for name, symbol in self.INDICES.items():
            df = self._fetch_index(symbol)
            if df.empty or len(df) < 2:
                report['indices'][name] = {'error': 'Insufficient data'}
                continue

            today = df.iloc[-1]
            prev = df.iloc[-2]
            close = float(today['Close'])
            prev_close = float(prev['Close'])
            change_pct = round(((close - prev_close) / prev_close) * 100, 2)

            rsi = self._compute_rsi(df['Close'])
            ema_20 = self._compute_ema(df['Close'], 20)
            ema_50 = self._compute_ema(df['Close'], 50)
            trend = self._trend_label(change_pct, rsi)

            report['indices'][name] = {
                'snapshot': {
                    'open': round(float(today['Open']), 2),
                    'high': round(float(today['High']), 2),
                    'low': round(float(today['Low']), 2),
                    'close': close,
                    'prev_close': prev_close,
                    'change_pct': change_pct,
                    'volume': int(today['Volume']) if int(today['Volume']) > 1000 else 0,
                },
                'technical': {
                    'rsi_14': rsi,
                    'ema_20': ema_20,
                    'ema_50': ema_50,
                    'trend_signal': 'BULLISH' if ema_20 > ema_50 else 'BEARISH',
                },
                'trend': trend,
            }

        # 2. Fetch Constituents for Sectors and Ranking (parallel)
        all_tickers = self.NIFTY_50_CONSTITUENTS
        try:
            ticker_changes = {}  # sym -> {'price': float, 'change_pct': float, 'volume': int}

            def _fetch_one(sym: str):
                """Fetch a single ticker's 2-day history and compute change."""
                try:
                    hist = yf.Ticker(sym).history(period='2d')
                    if hist.empty or len(hist) < 2:
                        # Fallback to 5d if 2d insufficient (weekends/holidays)
                        hist = yf.Ticker(sym).history(period='5d')
                    if hist.empty or len(hist) < 2:
                        return None
                    hist = hist.dropna(subset=['Close'])
                    if len(hist) < 2:
                        return None
                    prev = float(hist['Close'].iloc[-2])
                    curr = float(hist['Close'].iloc[-1])
                    if prev == 0:
                        return None
                    pct = round(((curr - prev) / prev) * 100, 2)
                    vol = int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns else 0
                    return (sym, {'price': round(curr, 2), 'change_pct': pct, 'volume': vol})
                except Exception:
                    return None

            # Run all fetches in parallel with 10 threads
            with ThreadPoolExecutor(max_workers=10) as pool:
                futures = {pool.submit(_fetch_one, sym): sym for sym in all_tickers}
                for future in as_completed(futures):
                    result = future.result()
                    if result:
                        ticker_changes[result[0]] = result[1]

            print(f"[ReportGen] Fetched {len(ticker_changes)}/{len(all_tickers)} tickers successfully.")

            # Gainers / Losers
            gl_results = [
                {'symbol': sym.replace('.NS', ''), 'price': data['price'], 'change_pct': data['change_pct']}
                for sym, data in ticker_changes.items()
            ]
            gl_results.sort(key=lambda x: x['change_pct'], reverse=True)
            gainers = gl_results[:5]
            losers = gl_results[-5:]

            # Sector Performance
            sector_scores = {}
            for sector, tickers in self.SECTOR_MAP.items():
                changes = [ticker_changes[sym]['change_pct'] for sym in tickers if sym in ticker_changes]
                if changes:
                    sector_scores[sector] = round(sum(changes) / len(changes), 2)

            sectors = dict(sorted(sector_scores.items(), key=lambda x: x[1], reverse=True))

            # Aggregated volume (estimate from top 20)
            agg_volume = sum(
                ticker_changes[sym]['volume']
                for sym in all_tickers[:20]
                if sym in ticker_changes
            )

        except Exception as e:
            print(f"[ReportGen] Constituent fetch failed: {e}")
            gainers, losers, sectors, agg_volume = [], [], {}, 0

        # 3. AI Insight Synthesis
        top_sectors = list(sectors.keys())
        nifty_data = report['indices'].get('NIFTY 50', {})
        rsi_val = nifty_data.get('technical', {}).get('rsi_14', 50)
        trend_val = nifty_data.get('trend', 'SIDEWAYS')
        insight = self._ai_insight(trend_val, top_sectors, rsi_val)

        report['market_intelligence'] = {
            'sectors': sectors,
            'top_gainers': gainers,
            'top_losers': losers,
            'aggregated_nifty_volume': agg_volume,
            'ai_insight': insight,
        }

        # Update cache with date tag
        self.__class__._cache = report
        self.__class__._cache_time = now
        self.__class__._cache_date = today_str
        print(f"[ReportGen] Cache updated at {now.isoformat()} for date {today_str}")
        return report
