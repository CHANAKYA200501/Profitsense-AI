from celery import shared_task
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_alert_to_user(user_id: str, message: str):
    logger.info(f"Sending alert to user {user_id}: {message}")
    return {"status": "delivered"}
