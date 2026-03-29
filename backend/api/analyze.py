from fastapi import APIRouter, Query
from services.report_generator import MarketReportGenerator
import yfinance as yf

router = APIRouter()

@router.get("/peers")
async def get_peer_comparison(symbol: str = Query(...)):
    """Fetch performance for sector-based peers of a given symbol."""
    gen = MarketReportGenerator()
    symbol_ns = f"{symbol}.NS" if not symbol.endswith(".NS") else symbol
    
    # Find the sector for this symbol
    target_sector = "Economy"
    for sector, tickers in gen.SECTOR_MAP.items():
        if symbol_ns in tickers:
            target_sector = sector
            break
            
    peers_list = gen.SECTOR_MAP.get(target_sector, ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"])
    
    results = []
    # Limit to 5 peers for performance
    for peer in peers_list[:6]:
        try:
            t = yf.Ticker(peer)
            h = t.history(period="2d")
            if len(h) >= 2:
                prev = float(h['Close'].iloc[-2])
                curr = float(h['Close'].iloc[-1])
                pct = round(((curr - prev) / prev) * 100, 2)
                results.append({
                    "symbol": peer.replace(".NS", ""),
                    "price": round(curr, 2),
                    "change_pct": pct,
                    "is_target": peer == symbol_ns
                })
        except Exception:
            continue
            
    return {
        "status": "success",
        "sector": target_sector,
        "peers": sorted(results, key=lambda x: x['change_pct'], reverse=True)
    }

@router.post("/")
async def analyze_custom():
    return {"message": "Custom analysis endpoint"}
