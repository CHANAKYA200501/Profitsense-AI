from fastapi import APIRouter
from agents.opportunity_radar import OpportunityRadarAgent

router = APIRouter()
radar_agent = OpportunityRadarAgent()

@router.get("/")
async def get_radar_alerts():
    """Returns the latest 'missed opportunity' alerts from the Radar agent."""
    alerts = radar_agent.scan_opportunities()
    return {"status": "success", "alerts": alerts}
