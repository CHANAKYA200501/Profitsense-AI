import os
import requests

class TelegramAlerter:
    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID", "default_chat")
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}" if self.bot_token else None

    def send_alert(self, signal: dict):
        if not self.base_url:
            print("Telegram not configured. Skipping alert.")
            return

        symbol = signal.get("symbol", "UNKNOWN")
        direction = signal.get("signal_direction", "bullish").upper()
        confidence = signal.get("confidence", 0)
        headline = signal.get("narration", {}).get("headline", "")
        
        message = (
            f"🚨 *ProfitSense AI LIVE ALERT* 🚨\n\n"
            f"*{symbol}* is showing a *{direction}* setup!\n"
            f"**Confidence**: {confidence}%\n\n"
            f"📰 **AI Insight**: {headline}\n\n"
            f"Check dashboard for full details."
        )

        try:
            r = requests.post(
                f"{self.base_url}/sendMessage",
                json={"chat_id": self.chat_id, "text": message, "parse_mode": "Markdown"},
                timeout=5
            )
            r.raise_for_status()
            print(f"Telegram alert sent for {symbol}")
        except Exception as e:
            print(f"Failed to send Telegram alert: {e}")
