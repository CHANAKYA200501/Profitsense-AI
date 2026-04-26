from fastapi import APIRouter
from services.video_engine import VideoSceneGenerator

router = APIRouter()

@router.get("/generate_scenes")
async def generate_market_wrap_scenes():
    """Generates a high-intensity 5-scene array for the Media Engine.
    Instantiated fresh each request so the date-aware cache in
    MarketReportGenerator always returns today's data.
    """
    try:
        gen = VideoSceneGenerator()
        scenes = gen.generate_market_wrap_scenes()
        return {"status": "success", "scenes": scenes, "count": len(scenes)}
    except Exception as e:
        import traceback
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}
