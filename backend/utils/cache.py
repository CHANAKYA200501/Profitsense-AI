import redis
import json
from typing import Optional
from datetime import timedelta

class RedisCache:
    """
    Redis key naming conventions and TTL policies:
    
    prices:{SYMBOL}           → Latest quote, TTL: 30 seconds
    signals:live              → Current active signals list, TTL: 5 minutes
    signals:history:{SYMBOL}  → Signal history for symbol, TTL: 1 hour
    backtest:{signal_type}    → Back-test stats, TTL: 24 hours
    mf:nav:{scheme_code}      → Latest NAV, TTL: 4 hours
    user:session:{token}      → User session, TTL: 24 hours
    scan:status               → Agent scan status, TTL: 60 seconds
    nifty:current             → Nifty 50 current value, TTL: 30 seconds
    alerts:queue:{user_id}    → Pending alerts for user, TTL: 1 hour
    """
    
    PRICE_TTL     = timedelta(seconds=30)
    SIGNAL_TTL    = timedelta(minutes=5)
    BACKTEST_TTL  = timedelta(hours=24)
    NAV_TTL       = timedelta(hours=4)
    SESSION_TTL   = timedelta(hours=24)
    
    def __init__(self, url: str = "redis://localhost:6379/0"):
        self.client = redis.from_url(url, decode_responses=True)
        self.pubsub = self.client.pubsub()
    
    def set_price(self, symbol: str, data: dict):
        self.client.setex(f"prices:{symbol}", self.PRICE_TTL, json.dumps(data))
    
    def get_price(self, symbol: str) -> Optional[dict]:
        v = self.client.get(f"prices:{symbol}")
        return json.loads(v) if v else None
    
    def set_live_signals(self, signals: list):
        self.client.setex("signals:live", self.SIGNAL_TTL, json.dumps(signals))
    
    def get_live_signals(self) -> Optional[list]:
        v = self.client.get("signals:live")
        return json.loads(v) if v else None
    
    def publish_signal(self, signal: dict):
        """Publish new signal to Redis pub/sub channel"""
        self.client.publish("channel:new_signals", json.dumps(signal))
    
    def set_backtest_stats(self, signal_type: str, stats: dict):
        self.client.setex(f"backtest:{signal_type}", self.BACKTEST_TTL, json.dumps(stats))
    
    def get_backtest_stats(self, signal_type: str) -> Optional[dict]:
        v = self.client.get(f"backtest:{signal_type}")
        return json.loads(v) if v else None
    
    def increment_scan_count(self):
        return self.client.incr("scan:total_count")
    
    def push_alert(self, user_id: str, alert: dict):
        key = f"alerts:queue:{user_id}"
        self.client.rpush(key, json.dumps(alert))
        self.client.expire(key, int(self.SESSION_TTL.total_seconds()))
    
    def pop_alerts(self, user_id: str) -> list:
        key = f"alerts:queue:{user_id}"
        alerts = []
        while True:
            item = self.client.lpop(key)
            if not item:
                break
            alerts.append(json.loads(item))
        return alerts
