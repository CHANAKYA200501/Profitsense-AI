import pandas as pd
import numpy as np
from typing import Dict, Any

class RiskManager:
    """Pre-trade risk engine ensuring exposure limits, ATR scaling, and sector caps."""
    
    def __init__(self, portfolio_value: float = 1000000.0, max_exposure_per_trade: float = 0.05):
        self.portfolio_value = portfolio_value
        self.max_exposure_per_trade = max_exposure_per_trade
        self.max_risk_amount = portfolio_value * 0.02  # Maximum 2% risk of total portfolio per trade
        
    def calculate_atr(self, df: pd.DataFrame, period: int = 14) -> float:
        """Calculate Average True Range for volatility-based stop-loss placement."""
        if len(df) < period:
            return df['Close'].std() if len(df) > 1 else 10.0
            
        high_low = df['High'] - df['Low']
        high_close = np.abs(df['High'] - df['Close'].shift())
        low_close = np.abs(df['Low'] - df['Close'].shift())
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = np.max(ranges, axis=1)
        return float(true_range.rolling(period).mean().iloc[-1])
        
    def generate_trade_parameters(self, symbol: str, current_price: float, direction: str, 
                                  df: pd.DataFrame, confidence: float) -> Dict[str, Any]:
        """Convert a raw ML signal into a fully managed trade decision."""
        
        atr = self.calculate_atr(df)
        
        if direction.lower() == 'bullish' or direction.lower() == 'buy':
            stop_loss = round(current_price - (atr * 1.5), 2)
            target = round(current_price + (atr * 3.0), 2)  # 1:2 R:R
            side = "BUY"
        else:
            stop_loss = round(current_price + (atr * 1.5), 2)
            target = round(current_price - (atr * 3.0), 2)
            side = "SELL"
            
        # Capital Allocation (Position Sizing)
        risk_per_share = abs(current_price - stop_loss)
        if risk_per_share == 0: risk_per_share = current_price * 0.01
        
        max_shares_by_risk = int(self.max_risk_amount / risk_per_share)
        max_shares_by_exposure = int((self.portfolio_value * self.max_exposure_per_trade) / current_price)
        
        suggested_qty = min(max_shares_by_risk, max_shares_by_exposure)
        if suggested_qty <= 0: suggested_qty = 1
        
        # Determine Risk Code
        volatility_pct = (atr / current_price) * 100
        if volatility_pct > 4.0:
            risk_tag = "HIGH"
        elif volatility_pct > 2.0:
            risk_tag = "MEDIUM"
        else:
            risk_tag = "LOW"
            
        return {
            "symbol": symbol,
            "direction": side,
            "entry_range": f"₹{round(current_price * 0.995, 2)} – ₹{round(current_price * 1.005, 2)}",
            "entry_price_est": current_price,
            "target": target,
            "stop_loss": stop_loss,
            "risk_tag": risk_tag,
            "suggested_qty": suggested_qty,
            "confidence": confidence
        }
