from datetime import datetime
from typing import List, Dict
from services.report_generator import MarketReportGenerator
from agents.opportunity_radar import OpportunityRadarAgent

class VideoSceneGenerator:
    """Orchestrates real-time market data into a 60-second cinematic scene array.
    TRANSFORMED: Media Engine Unit Orchestrator.
    """
    
    def __init__(self):
        self.report_gen = MarketReportGenerator()
        self.radar = OpportunityRadarAgent()
        
    def generate_market_wrap_scenes(self) -> List[Dict]:
        """Generates a sequence of 5 tactical scenes for the frontend Media Engine."""
        report = self.report_gen.generate_report()
        nifty = report['indices'].get('NIFTY 50', {}).get('snapshot', {})
        sectors = report['market_intelligence'].get('sectors', {})
        radar_signals = self.radar.scan_opportunities()
        top_radar = radar_signals[0] if radar_signals else {"headline": "Stable market consolidation", "impact_est": "+0.0%"}
        
        scenes = []
        
        # 1. INTRO_SCANLINE
        scenes.append({
            "id": "INTRO",
            "title": "MARKET_TELEMETRY_DAILY_WRAP",
            "subtitle": f"SESSION_DATE: {datetime.now().strftime('%d %B %Y')}",
            "visual_type": "GRID_SCANLINE",
            "narration_text": f"Initializing tactical wrap for {datetime.now().strftime('%B %d')}. Market sentiment is currently {nifty.get('change_pct', 0) >= 0 and 'BULLISH' or 'BEARISH'}."
        })
        
        # 2. INDEX_PULSE
        scenes.append({
            "id": "INDEX_PULSE",
            "title": "NIFTY_50_MOMENTUM_VECTOR",
            "value": f"{nifty.get('close', 0):,.2f}",
            "change": f"{nifty.get('change_pct', 0)}%",
            "visual_type": "INDEX_CHART_ZOOM",
            "narration_text": f"NIFTY 50 closed at {nifty.get('close', 0):,.2f}, a change of {nifty.get('change_pct', 0)}% from previous close. RSI-14 rests at {report['indices'].get('NIFTY 50', {}).get('technical', {}).get('rsi_14', 50)}."
        })
        
        # 3. SECTOR_VELOCITY (RACE CHART)
        top_3_sectors = [ {"name": k, "value": v} for k,v in list(sectors.items())[:3] ]
        scenes.append({
            "id": "SECTOR_VELOCITY",
            "title": "SECTOR_ROTATION_RACE_V4",
            "sectors": top_3_sectors,
            "visual_type": "RACE_CHART",
            "narration_text": f"Top sector velocity identified in {top_3_sectors[0]['name']} and {top_3_sectors[1]['name']}."
        })
        
        # 4. RADAR_SIGNAL_DEEP_DIVE
        scenes.append({
            "id": "RADAR_SIGNAL",
            "title": f"OPPORTUNITY_RADAR: {top_radar['symbol']}",
            "headline": top_radar['headline'],
            "impact": top_radar['impact_est'],
            "visual_type": "HUD_TARGET_LOCK",
            "narration_text": f"Critical signal discovered via Opportunity Radar. {top_radar['headline']} suggests significant alpha potential."
        })
        
        # 5. OUTRO_COMMAND
        scenes.append({
            "id": "OUTRO",
            "title": "READY_FOR_NEXT_SYNC",
            "subtitle": "PROFITSENSE_AI::MEDIA_ENGINE_OFFLINE",
            "visual_type": "TERMINAL_FADE",
            "narration_text": "Ending market wrap. Review your signal matrix in the Command Deck for tactical entries."
        })
        
        return scenes
