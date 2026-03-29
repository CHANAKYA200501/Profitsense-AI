"""
Technical Indicator Rules Engine — RSI/MACD/EMA decision logic for BUY/SELL/HOLD.
Provides time-horizon classification (Intraday / Short / Swing).
"""
import pandas as pd
import numpy as np

class TechnicalRulesEngine:
    """Rule-based overlay on top of the ML ensemble for explainable BUY/SELL decisions."""

    def compute_rsi(self, series: pd.Series, period: int = 14) -> float:
        delta = series.diff()
        gain = delta.where(delta > 0, 0.0).rolling(period).mean()
        loss = (-delta.where(delta < 0, 0.0)).rolling(period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        val = rsi.iloc[-1]
        return round(float(val), 2) if not pd.isna(val) else 50.0

    def compute_macd(self, series: pd.Series) -> dict:
        ema12 = series.ewm(span=12).mean()
        ema26 = series.ewm(span=26).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9).mean()
        histogram = macd_line - signal_line
        return {
            'macd': round(float(macd_line.iloc[-1]), 4),
            'signal': round(float(signal_line.iloc[-1]), 4),
            'histogram': round(float(histogram.iloc[-1]), 4),
            'crossover': 'BULLISH' if float(histogram.iloc[-1]) > 0 and float(histogram.iloc[-2]) <= 0 else
                         'BEARISH' if float(histogram.iloc[-1]) < 0 and float(histogram.iloc[-2]) >= 0 else 'NEUTRAL'
        }

    def compute_ema(self, series: pd.Series, span: int) -> float:
        return round(float(series.ewm(span=span).mean().iloc[-1]), 2)

    def detect_breakout(self, df: pd.DataFrame, lookback: int = 20) -> bool:
        if len(df) < lookback + 1:
            return False
        recent_high = df['High'].iloc[-(lookback+1):-1].max()
        current_close = df['Close'].iloc[-1]
        return float(current_close) > float(recent_high)

    def classify_time_horizon(self, df: pd.DataFrame) -> str:
        """Classify signal as Intraday, Short-term, or Swing based on trend persistence."""
        if len(df) < 20:
            return 'Intraday'
        close = df['Close']
        ema5 = close.ewm(span=5).mean().iloc[-1]
        ema20 = close.ewm(span=20).mean().iloc[-1]
        ema50 = close.ewm(span=50).mean().iloc[-1] if len(df) >= 50 else ema20

        if float(ema5) > float(ema20) > float(ema50):
            return 'Swing'
        elif float(ema5) > float(ema20):
            return 'Short-term'
        return 'Intraday'

    def generate_decision(self, symbol: str, df: pd.DataFrame, ml_confidence: float, ml_direction: str) -> dict:
        """
        Combine ML score with technical rules to produce a final BUY/SELL/HOLD decision.
        Returns a complete actionable trade recommendation.
        """
        close = df['Close']
        current_price = float(close.iloc[-1])

        rsi = self.compute_rsi(close)
        macd = self.compute_macd(close)
        ema_20 = self.compute_ema(close, 20)
        ema_50 = self.compute_ema(close, 50) if len(df) >= 50 else ema_20
        is_breakout = self.detect_breakout(df)
        time_horizon = self.classify_time_horizon(df)

        # ── Rule-Based Score ──
        rule_score = 0
        reasons = []

        # RSI Rules
        if rsi < 30:
            rule_score += 2
            reasons.append(f'RSI oversold ({rsi})')
        elif rsi < 40:
            rule_score += 1
            reasons.append(f'RSI approaching oversold ({rsi})')
        elif rsi > 70:
            rule_score -= 2
            reasons.append(f'RSI overbought ({rsi})')
        elif rsi > 60:
            rule_score -= 1
            reasons.append(f'RSI approaching overbought ({rsi})')

        # MACD Rules
        if macd['crossover'] == 'BULLISH':
            rule_score += 2
            reasons.append('MACD bullish crossover')
        elif macd['crossover'] == 'BEARISH':
            rule_score -= 2
            reasons.append('MACD bearish crossover')
        elif macd['histogram'] > 0:
            rule_score += 1
            reasons.append('MACD histogram positive')

        # EMA Rules
        if ema_20 > ema_50:
            rule_score += 1
            reasons.append('EMA-20 above EMA-50 (uptrend)')
        else:
            rule_score -= 1
            reasons.append('EMA-20 below EMA-50 (downtrend)')

        # Breakout
        if is_breakout:
            rule_score += 2
            reasons.append('20-day high breakout detected')

        # Volume surge check
        if len(df) >= 20:
            avg_vol = float(df['Volume'].iloc[-20:].mean())
            curr_vol = float(df['Volume'].iloc[-1])
            if curr_vol > avg_vol * 1.5:
                rule_score += 1
                reasons.append(f'Volume surge ({round(curr_vol/avg_vol, 1)}x avg)')

        # ── Final Decision ──
        # ML contributes 60%, rules 40%
        ml_score = (ml_confidence / 100) * 3 if ml_direction == 'bullish' else -(ml_confidence / 100) * 3
        combined = ml_score + rule_score

        if combined >= 2.2:
            recommendation = 'BUY'
        elif combined <= -2.2:
            recommendation = 'SELL'
        else:
            recommendation = 'HOLD'

        # ATR for target/stop-loss
        if len(df) >= 14:
            high_low = df['High'] - df['Low']
            high_close = abs(df['High'] - df['Close'].shift())
            low_close = abs(df['Low'] - df['Close'].shift())
            ranges = pd.concat([high_low, high_close, low_close], axis=1)
            atr = float(ranges.max(axis=1).rolling(14).mean().iloc[-1])
        else:
            atr = current_price * 0.02

        if recommendation == 'BUY':
            target = round(current_price + atr * 3, 2)
            stop_loss = round(current_price - atr * 1.5, 2)
        elif recommendation == 'SELL':
            target = round(current_price - atr * 3, 2)
            stop_loss = round(current_price + atr * 1.5, 2)
        else:
            target = round(current_price + atr * 1.5, 2)
            stop_loss = round(current_price - atr * 1.5, 2)

        # Risk level
        volatility_pct = (atr / current_price) * 100
        risk = 'HIGH' if volatility_pct > 4 else 'MEDIUM' if volatility_pct > 2 else 'LOW'

        return {
            'symbol': symbol,
            'recommendation': recommendation,
            'entry_range': f'₹{round(current_price * 0.995, 2)} – ₹{round(current_price * 1.005, 2)}',
            'current_price': current_price,
            'target': target,
            'stop_loss': stop_loss,
            'confidence': ml_confidence,
            'risk_level': risk,
            'time_horizon': time_horizon,
            'technical_indicators': {
                'rsi_14': rsi,
                'macd': macd,
                'ema_20': ema_20,
                'ema_50': ema_50,
                'breakout': is_breakout,
            },
            'decision_reasons': reasons,
        }
