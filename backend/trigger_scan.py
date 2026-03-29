import asyncio
import json
import redis.asyncio as aioredis
from agents.orchestrator import AgentOrchestrator

async def trigger():
    print("Initializing Orchestrator to scan real live market data via yfinance...")
    orch = AgentOrchestrator()
    signals = await orch.run_full_scan()
    print(f"Generated {len(signals)} signals!")
    
    redis_client = aioredis.from_url("redis://localhost:6379/0")
    for sig in signals:
        print(f"Publishing {sig['symbol']} to Redis live_signals channel...")
        await redis_client.publish("live_signals", json.dumps(sig))
        await asyncio.sleep(2) # Stagger output for UI effect
        
    print("Scan complete. Signals pushed to Dashboard.")

if __name__ == "__main__":
    asyncio.run(trigger())
