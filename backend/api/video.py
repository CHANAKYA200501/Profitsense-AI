from fastapi import APIRouter
from services.video_engine import VideoSceneGenerator

router = APIRouter()
video_gen = VideoSceneGenerator()

@router.get("/generate_scenes")
async def generate_market_wrap_scenes():
    """Generates a high-intensity 5-scene array for the Media Engine."""
    scenes = video_gen.generate_market_wrap_scenes()
    return {"status": "success", "scenes": scenes}
