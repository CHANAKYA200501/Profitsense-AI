from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "profitsense",
    broker="redis://redis:6379/1",
    backend="redis://redis:6379/2",
    include=["backend.tasks.scan_tasks", "backend.tasks.alert_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Scheduled tasks
celery_app.conf.beat_schedule = {
    # Market hours: scan every 5 mins
    "scan-signals": {
        "task": "backend.tasks.scan_tasks.run_signal_scan",
        "schedule": crontab(minute="*/5", hour="9-15", day_of_week="mon-fri"),
    },
    # Pre-market: refresh fundamentals daily
    "refresh-fundamentals": {
        "task": "backend.tasks.scan_tasks.refresh_all_fundamentals",
        "schedule": crontab(hour=8, minute=30),
    },
    # Post-market: update back-test outcomes
    "update-backtest-outcomes": {
        "task": "backend.tasks.scan_tasks.update_signal_outcomes",
        "schedule": crontab(hour=16, minute=0, day_of_week="mon-fri"),
    },
    # Daily: ingest insider trades
    "ingest-insider-trades": {
        "task": "backend.tasks.scan_tasks.ingest_insider_trades",
        "schedule": crontab(hour=20, minute=0),
    },
    # Daily: ingest AMFI NAV
    "update-mf-navs": {
        "task": "backend.tasks.scan_tasks.update_mf_navs",
        "schedule": crontab(hour=22, minute=0),
    },
    # Weekly Sunday: retrain ML models
    "retrain-models": {
        "task": "backend.tasks.scan_tasks.retrain_all_models",
        "schedule": crontab(hour=2, minute=0, day_of_week="sun"),
    }
}
