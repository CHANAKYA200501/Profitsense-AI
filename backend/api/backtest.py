from fastapi import APIRouter

router = APIRouter()

@router.post("/run")
async def run_backtest():
    return {"metrics": {"sharpe": 1.5, "max_drawdown": 10.0}}
