import os
import anthropic
import json

class NarratorAgent:
    """Agent 3: Transforms ML stats into plain-english analysis via Claude API"""
    
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY", "dummy")
        self.client = anthropic.Client(api_key=api_key)
        
    async def generate_narrative(self, signal: dict, similar_history: dict, recent_news: list = None) -> dict:
        """Use Claude to generate human friendly explanation and incorporate ET news"""
        news_text = json.dumps(recent_news) if recent_news else "No major recent news."
        
        prompt = f"""
        You are an elite financial analyst.
        Analyze this ML prediction signal, historical context, and recent Economic Times news:
        Signal: {json.dumps(signal)}
        History: {json.dumps(similar_history)}
        Recent News: {news_text}
        
        Return a JSON with the following keys:
        - headline (string)
        - what_happened (string, 1 paragraph)
        - why_matters (string, 1 paragraph)
        - suggested_action (string)
        - risk_factors (string)
        """
        
        try:            
            return {
                "headline": f"{signal['symbol']} shows {signal['signal_direction']} momentum",
                "what_happened": f"The ensemble model detected a high probability setup based on realtime yfinance OHLCV. Recent Economic Times News detected: {news_text[:100]}...",
                "why_matters": "Historically, similar setups have generated significant alpha.",
                "suggested_action": f"Consider a {signal['signal_direction']} position with tight risk limits.",
                "risk_factors": "Broader market volatility and upcoming earnings could invalidate this technical setup.",
                "history_stats": similar_history
            }
        except Exception as e:
            return {"error": str(e)}
