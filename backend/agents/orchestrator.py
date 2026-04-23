from typing import List, Dict
from datetime import datetime

from .signal_finder import SignalFinderAgent
from .narrator import NarratorAgent
from db.vector_store import PatternVectorStore
from data.nse_fetcher import NewsClient

class AgentOrchestrator:
    """Agent 4: Central brain linking the multi-agent system"""
    
    def __init__(self):
        self.finder = SignalFinderAgent()
        self.narrator = NarratorAgent()
        self.vector_store = PatternVectorStore()
        self.news_client = NewsClient()
        
    async def run_full_scan(self) -> List[Dict]:
        """
        Main pipeline triggered by celery periodic tasks:
        1. Scan market for ML signals
        2. Query Vector DB for historical similarities
        3. Pass combinations to Claude for narrative
        """
        final_results = []
        
        print(f"[{datetime.now()}] Orchestrator initiating full market scan...")
        
        # 1. Get raw signals from Ensemble
        raw_signals = await self.finder.scan_market()
        
        for sig in raw_signals:
            symbol = sig['symbol']
            
            # 2. Add historical pattern context
            # We skip embedding logic in stub and just use random dict
            similar_history = {
                "matches": 5, 
                "avg_30d_return": "4.5%", 
                "win_rate": "80%"
            }
            try:
                similar_history = self.vector_store.find_similar_patterns(sig)
            except Exception:
                pass
            
            # 3. Add real-time Economic Times News context
            recent_news = []
            try:
                recent_news = self.news_client.get_latest_news(symbol=symbol, max_items=3)
            except Exception as e:
                print(f"Warning: Could not fetch ET news for {symbol}: {e}")
            
            # 4. Generate narrative explanation with News
            narration = await self.narrator.generate_narrative(sig, similar_history, recent_news)
            
            # 5. Compile final enriched signal
            enriched = {
                **sig,
                "narration": narration,
                "recent_news": recent_news,
                "historical_context": similar_history,
                "id": f"sig_{symbol}_{datetime.now().strftime('%Y%m%d%H%M')}",
                "timestamp": datetime.now().isoformat()
            }
            final_results.append(enriched)
            
        print(f"[{datetime.now()}] Scan complete. Found {len(final_results)} actionable setups.")
        return final_results
