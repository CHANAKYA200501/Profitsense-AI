import pandas as pd
import numpy as np
import yfinance as yf

try:
    import pandas_ta as ta
except ImportError:
    ta = None

from datetime import datetime

class FeatureEngineer:
    """
    Builds ML features from raw OHLCV data for signal prediction.
    Target variable: will stock outperform Nifty 50 by >3% in next 30 days?
    """
    
    NIFTY_SYMBOL = "^NSEI"
    
    def build_features(self, symbol: str, df: pd.DataFrame) -> pd.DataFrame:
        """
        Input: OHLCV DataFrame with DatetimeIndex
        Output: Feature matrix ready for XGBoost training
        """
        feat = pd.DataFrame(index=df.index)
        close = df['Close']
        high = df['High']
        low = df['Low']
        volume = df['Volume']
        
        # ── PRICE FEATURES ──────────────────────────────
        if ta is None:
            return df
            
        feat['returns_1d']   = close.pct_change(1)
        feat['returns_5d']   = close.pct_change(5)
        feat['returns_10d']  = close.pct_change(10)
        feat['returns_20d']  = close.pct_change(20)
        feat['returns_60d']  = close.pct_change(60)
        
        # Distance from moving averages (normalized)
        feat['dist_from_20ma']  = (close - close.rolling(20).mean()) / close.rolling(20).mean()
        feat['dist_from_50ma']  = (close - close.rolling(50).mean()) / close.rolling(50).mean()
        feat['dist_from_200ma'] = (close - close.rolling(200).mean()) / close.rolling(200).mean()
        
        # 52-week position
        feat['pct_from_52w_high'] = (close - high.rolling(252).max()) / high.rolling(252).max()
        feat['pct_from_52w_low']  = (close - low.rolling(252).min()) / low.rolling(252).min()
        feat['is_52w_breakout']   = (close > high.rolling(252).shift(1).max()).astype(int)
        
        # ── MOMENTUM FEATURES ────────────────────────────
        feat['rsi_14']  = ta.rsi(close, length=14)
        feat['rsi_7']   = ta.rsi(close, length=7)
        feat['rsi_28']  = ta.rsi(close, length=28)
        
        macd = ta.macd(close, fast=12, slow=26, signal=9)
        feat['macd_line']     = macd['MACD_12_26_9']
        feat['macd_signal']   = macd['MACDs_12_26_9']
        feat['macd_hist']     = macd['MACDh_12_26_9']
        feat['macd_bullish']  = (feat['macd_line'] > feat['macd_signal']).astype(int)
        feat['macd_crossover']= ((feat['macd_line'] > feat['macd_signal']) & 
                                  (feat['macd_line'].shift(1) < feat['macd_signal'].shift(1))).astype(int)
        
        # Golden/Death Cross
        sma50 = close.rolling(50).mean()
        sma200 = close.rolling(200).mean()
        feat['golden_cross'] = ((sma50 > sma200) & (sma50.shift(1) <= sma200.shift(1))).astype(int)
        feat['death_cross']  = ((sma50 < sma200) & (sma50.shift(1) >= sma200.shift(1))).astype(int)
        feat['above_200ma']  = (close > sma200).astype(int)
        
        # Stochastic
        stoch = ta.stoch(high, low, close)
        feat['stoch_k'] = stoch['STOCHk_14_3_3']
        feat['stoch_d'] = stoch['STOCHd_14_3_3']
        
        # Williams %R
        feat['willr_14'] = ta.willr(high, low, close, length=14)
        
        # ── VOLATILITY FEATURES ──────────────────────────
        feat['atr_14']       = ta.atr(high, low, close, length=14)
        feat['atr_pct']      = feat['atr_14'] / close  # normalized ATR
        
        bb = ta.bbands(close, length=20, std=2)
        feat['bb_width']     = (bb['BBU_20_2.0'] - bb['BBL_20_2.0']) / bb['BBM_20_2.0']
        feat['bb_pct']       = (close - bb['BBL_20_2.0']) / (bb['BBU_20_2.0'] - bb['BBL_20_2.0'])
        feat['bb_squeeze']   = (feat['bb_width'] < feat['bb_width'].rolling(126).mean() * 0.7).astype(int)
        
        feat['hist_vol_20d'] = close.pct_change().rolling(20).std() * np.sqrt(252)
        feat['hist_vol_60d'] = close.pct_change().rolling(60).std() * np.sqrt(252)
        feat['vol_ratio']    = feat['hist_vol_20d'] / feat['hist_vol_60d']  # vol expansion
        
        # ── VOLUME FEATURES ──────────────────────────────
        feat['vol_ratio_20d']   = volume / volume.rolling(20).mean()
        feat['vol_ratio_5d']    = volume / volume.rolling(5).mean()
        feat['vol_breakout']    = (feat['vol_ratio_20d'] > 2.0).astype(int)
        
        obv = ta.obv(close, volume)
        feat['obv_trend']       = (obv > obv.rolling(20).mean()).astype(int)
        feat['obv_divergence']  = self._calc_divergence(close, obv, 20)
        
        # Accumulation/Distribution
        feat['ad_line']         = ta.ad(high, low, close, volume)
        feat['ad_trend']        = (feat['ad_line'] > feat['ad_line'].rolling(20).mean()).astype(int)
        
        # ── TREND FEATURES ───────────────────────────────
        feat['adx_14']  = ta.adx(high, low, close, length=14)['ADX_14']
        feat['strong_trend'] = (feat['adx_14'] > 25).astype(int)
        
        # Trend consistency (% of last 20 days that were up)
        feat['trend_consistency_20d'] = (close.pct_change() > 0).rolling(20).mean()
        
        # ── MARKET RELATIVE FEATURES ─────────────────────
        # Beta and relative strength vs Nifty 50
        nifty = yf.download(self.NIFTY_SYMBOL, 
                             start=df.index[0], end=df.index[-1], progress=False)['Close']
        nifty = nifty.reindex(df.index, method='ffill')
        
        stock_ret = close.pct_change()
        nifty_ret = nifty.pct_change()
        
        # Rolling beta (60-day)
        cov = stock_ret.rolling(60).cov(nifty_ret)
        var = nifty_ret.rolling(60).var()
        feat['beta_60d'] = cov / var
        
        # Relative strength (stock return / nifty return, 20 days)
        feat['rs_vs_nifty_20d'] = (
            (close / close.shift(20)) / (nifty / nifty.shift(20))
        )
        feat['rs_vs_nifty_60d'] = (
            (close / close.shift(60)) / (nifty / nifty.shift(60))
        )
        feat['outperforming_nifty'] = (feat['rs_vs_nifty_20d'] > 1.0).astype(int)
        
        # ── CALENDAR FEATURES ────────────────────────────
        feat['day_of_week']    = df.index.dayofweek
        feat['month']          = df.index.month
        feat['quarter']        = df.index.quarter
        feat['is_month_end']   = (df.index.day >= 25).astype(int)
        feat['is_expiry_week'] = self._mark_expiry_weeks(df.index)
        
        # ── INSIDER / FUNDAMENTAL FEATURES ───────────────
        # These are sparse (not daily) — forward-filled
        # populated from NSE PIT data in the full pipeline
        feat['insider_buy_count_30d']  = 0  # filled by data pipeline
        feat['insider_buy_value_cr']   = 0
        feat['promoter_pledge_pct']    = 0
        feat['earnings_surprise_pct']  = 0
        
        return feat.dropna()
    
    def _calc_divergence(self, price: pd.Series, indicator: pd.Series, window: int) -> pd.Series:
        """Detects bullish/bearish divergence: +1 bullish, -1 bearish, 0 none"""
        price_dir = price.diff(window).apply(np.sign)
        ind_dir   = indicator.diff(window).apply(np.sign)
        divergence = pd.Series(0, index=price.index)
        divergence[price_dir == 1 and ind_dir == -1] = -1  # bearish: price up, indicator down
        divergence[price_dir == -1 and ind_dir == 1] = 1   # bullish: price down, indicator up
        return divergence
    
    def _mark_expiry_weeks(self, idx: pd.DatetimeIndex) -> pd.Series:
        """Mark NSE monthly expiry weeks (last Thursday of month)"""
        s = pd.Series(0, index=idx)
        for date in idx:
            # Last Thursday of month
            import calendar
            last_day = calendar.monthrange(date.year, date.month)[1]
            last_thu = max(d for d in range(last_day, last_day-7, -1)
                          if datetime(date.year, date.month, d).weekday() == 3)
            if abs(date.day - last_thu) <= 3:
                s[date] = 1
        return s
    
    def build_target(self, symbol: str, df: pd.DataFrame, 
                     horizon_days: int = 30, alpha_threshold: float = 0.03) -> pd.Series:
        """
        Target: 1 if stock outperforms Nifty by >3% in next {horizon_days} days
        """
        close = df['Close']
        nifty = yf.download(self.NIFTY_SYMBOL, 
                             start=df.index[0], end=df.index[-1], progress=False)['Close']
        nifty = nifty.reindex(df.index, method='ffill')
        
        stock_fwd_return = close.shift(-horizon_days) / close - 1
        nifty_fwd_return = nifty.shift(-horizon_days) / nifty - 1
        
        alpha = stock_fwd_return - nifty_fwd_return
        target = (alpha > alpha_threshold).astype(int)
        return target
