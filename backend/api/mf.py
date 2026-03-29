from fastapi import APIRouter

router = APIRouter()

@router.get("/nav")
async def get_nav():
    return {"schemes": []}
