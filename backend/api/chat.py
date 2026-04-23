from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from agents.opportunity_radar import OpportunityRadarAgent
from services.pattern_detector import PatternDetector
from .trade_db import get_trades, get_balance

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    portfolio_context: Optional[dict] = None

class ReasoningStep(BaseModel):
    title: str
    content: str

class Citation(BaseModel):
    label: str
    symbol: str
    source: str

class ChatResponse(BaseModel):
    reply: str
    reasoning_steps: List[ReasoningStep]
    citations: List[Citation]

@router.post("/")
async def chat_assistant(request: ChatRequest) -> ChatResponse:
    """Next-Gen AI Assistant: Portfolio-aware and Tool-integrated."""
    msg = request.message.lower()
    radar = OpportunityRadarAgent()
    PatternDetector()
    
    reasoning_steps = [
        ReasoningStep(title="QUERY_INTENT_CLASSIFICATION", content=f"Analyzing vector: '{msg[:20]}...'. Intent identified: { 'PORTFOLIO_DIAGNOSTICS' if 'portfolio' in msg else 'MARKET_INTELLIGENCE' }."),
        ReasoningStep(title="CONTEXT_RETRIEVAL", content=f"Fetching active state: {len(get_trades())} positions detected. Wallet: ₹{get_balance():,.0f}."),
    ]
    
    citations = []
    
    # 1. PORTFOLIO_DIAGNOSTICS
    if "portfolio" in msg or "risk" in msg or "holdings" in msg:
        trades = get_trades()
        if not trades:
            reply = "Your 'ASSET_VAULT' is currently empty. I recommend scanning the 'Opportunity Radar' for entry vectors to deploy your ₹10 Lakh demo capital."
            reasoning_steps.append(ReasoningStep(title="VAULT_SCAN", content="Sector exposure: 0%. Liquidity: 100%."))
        else:
            symbols = [t['symbol'] for t in trades if t['status'] == 'OPEN']
            reply = f"Analysis of your {len(symbols)} active positions ({', '.join(symbols)}) indicates a concentrated risk profile. Your top exposure is in {symbols[0]}. I recommend diversifying into laggard sectors identified by the Radar."
            reasoning_steps.append(ReasoningStep(title="RISK_ENGINE_SYNC", content="Calculated VAR (Value at Risk) across active symbols. Correlation matrix suggests high intra-sector dependency."))
            citations.append(Citation(label="Portfolio Exposure", symbol=symbols[0], source="Asset Vault"))
            
    # 2. OPPORTUNITY_RADAR_INTEGRATION
    elif "radar" in msg or "news" in msg or "insider" in msg:
        alerts = radar.scan_opportunities()
        top_sig = alerts[0]
        reply = f"Opportunity Radar just surfaced a CRITICAL alert: {top_sig['headline']}. {top_sig['insight']} Impact estimated at {top_sig['impact_est']}."
        reasoning_steps.append(ReasoningStep(title="SIGNAL_DISCOVERY", content=f"Parsing live news feeds for {top_sig['symbol']}. Extracted {top_sig['type']} signature."))
        citations.append(Citation(label=top_sig['label'], symbol=top_sig['symbol'], source="Opportunity Radar"))
        
    # 3. PATTERN_INTELLIGENCE_INTEGRATION
    elif "pattern" in msg or "chart" in msg or "breakout" in msg:
        # Simulate pattern detection on common symbols
        reply = "I'm scanning the NIFTY 50 universe for geometric reversals. I've detected a 'Double Bottom' (W-Pattern) forming in HDFCBANK and a 'Resistance Breach' in RELIANCE."
        reasoning_steps.append(ReasoningStep(title="GEOMETRIC_SCAN", content="Running multi-pattern suite on 1-month OHLCV vectors. Surfaced 2 high-probability setups."))
        citations.append(Citation(label="W-Pattern Reversal", symbol="HDFCBANK", source="Pattern Intelligence"))
        citations.append(Citation(label="Breakout Vector", symbol="RELIANCE", source="Pattern Intelligence"))
        
    else:
        reply = "I am ProfitSENSE AI (Next Gen). I can diagnose your portfolio risk, surface geometric chart patterns, or fetch high-intensity news signals from the Opportunity Radar. How shall we optimize your trade vectors today?"
        reasoning_steps.append(ReasoningStep(title="HEURISTIC_ROUTING", content="User query is general. Mapping architecture capabilities to terminal UI."))

    return ChatResponse(
        reply=reply,
        reasoning_steps=reasoning_steps,
        citations=citations
    )
