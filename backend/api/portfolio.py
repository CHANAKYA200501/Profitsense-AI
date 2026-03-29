from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_portfolio():
    return {"portfolio_value": 0, "positions": []}
