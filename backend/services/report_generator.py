"""
Market Report Generator — Daily NIFTY + SENSEX intelligence reports.
Aggregates OHLCV data, computes technical indicators, and generates AI insights.
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

class MarketReportGenerator:
    """Generates comprehensive daily reports for NIFTY 50 and BSE SENSEX."""

    INDICES = {
        'NIFTY 50':   '^NSEI',
        'SENSEX':     '^BSESN',
    }

    NIFTY_50_CONSTITUENTS = [
        'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
        'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS',
        'LT.NS', 'AXISBANK.NS', 'BAJFINANCE.NS', 'ASIANPAINT.NS', 'MARUTI.NS',
        'TITAN.NS', 'SUNPHARMA.NS', 'ULTRACEMCO.NS', 'NESTLEIND.NS', 'WIPRO.NS',
        'HCLTECH.NS', 'BAJAJFINSV.NS', 'POWERGRID.NS', 'NTPC.NS', 'TATAMOTORS.NS',
        'ADANIENT.NS', 'ADANIPORTS.NS', 'GRASIM.NS', 'DIVISLAB.NS', 'DRREDDY.NS',
        'CIPLA.NS', 'APOLLOHOSP.NS', 'EICHERMOT.NS', 'JSWSTEEL.NS', 'TATASTEEL.NS',
        'M&M.NS', 'TATACONSUM.NS', 'COALINDIA.NS', 'ONGC.NS', 'BPCL.NS',
        'HEROMOTOCO.NS', 'TECHM.NS', 'BRITANNIA.NS', 'INDUSINDBK.NS', 'HINDALCO.NS',
        'BAJAJ-AUTO.NS', 'SBILIFE.NS', 'HDFCLIFE.NS', 'UPL.NS', 'SHRIRAMFIN.NS',
    ]

    SECTOR_MAP = {
        'Banking': ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'INDUSINDBK.NS'],
        'IT': ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS'],
        'Auto': ['MARUTI.NS', 'TATAMOTORS.NS', 'M&M.NS', 'EICHERMOT.NS', 'BAJAJ-AUTO.NS', 'HEROMOTOCO.NS'],
        'Pharma': ['SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'DIVISLAB.NS', 'APOLLOHOSP.NS'],
        'Energy': ['RELIANCE.NS', 'NTPC.NS', 'POWERGRID.NS', 'ONGC.NS', 'BPCL.NS', 'COALINDIA.NS', 'ADANIENT.NS'],
        'FMCG': ['HINDUNILVR.NS', 'ITC.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'TATACONSUM.NS'],
        'Metals': ['TATASTEEL.NS', 'JSWSTEEL.NS', 'HINDALCO.NS'],
        'Infra': ['LT.NS', 'ULTRACEMCO.NS', 'GRASIM.NS', 'ADANIPORTS.NS'],
    }

    _cache = {}
    _cache_time = None
    _CACHE_DURATION = timedelta(minutes=5)

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
        if self._cache_time and (now - self._cache_time) < self._CACHE_DURATION:
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

        # 2. Bulk Fetch Constituents for Sectors and Ranking
        all_tickers = self.NIFTY_50_CONSTITUENTS
        try:
            bulk_data = yf.download(all_tickers, period='2d', group_by='ticker', silent=True)
            
            # Gainers / Losers
            gl_results = []
            for sym in all_tickers:
                try:
                    ticker_df = bulk_data[sym]
                    if not ticker_df.empty and len(ticker_df) >= 2:
                        prev = float(ticker_df['Close'].iloc[-2])
                        curr = float(ticker_df['Close'].iloc[-1])
                        pct = round(((curr - prev) / prev) * 100, 2)
                        gl_results.append({'symbol': sym.replace('.NS', ''), 'price': round(curr, 2), 'change_pct': pct})
                except Exception: continue
            
            gl_results.sort(key=lambda x: x['change_pct'], reverse=True)
            gainers = gl_results[:5]
            losers = gl_results[-5:]

            # Sector Performance
            sector_scores = {}
            for sector, tickers in self.SECTOR_MAP.items():
                changes = []
                for sym in tickers:
                    try:
                        ticker_df = bulk_data[sym]
                        if not ticker_df.empty and len(ticker_df) >= 2:
                            prev = float(ticker_df['Close'].iloc[-2])
                            curr = float(ticker_df['Close'].iloc[-1])
                            changes.append(((curr - prev) / prev) * 100)
                    except Exception: continue
                if changes:
                    sector_scores[sector] = round(sum(changes) / len(changes), 2)
            
            sectors = dict(sorted(sector_scores.items(), key=lambda x: x[1], reverse=True))
            
            # Aggregated volume (estimate from top 20)
            agg_volume = 0
            for sym in all_tickers[:20]:
                try:
                    ticker_df = bulk_data[sym]
                    if not ticker_df.empty:
                        agg_volume += int(ticker_df['Volume'].iloc[-1])
                except Exception: continue

        except Exception as e:
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

        # Update cache
        self.__class__._cache = report
        self.__class__._cache_time = now
        return report
