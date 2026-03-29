from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/")
async def list_signals():
    """Returns signals list (Note: main.py overlays this logic)"""
    return {"signals": []}

@router.get("/{signal_id}")
async def get_signal_detail(signal_id: str):
    return {"id": signal_id, "detail": "placeholder"}
