import json
from app.models.models import AlertEventHistory
import asyncio
import logging
from app.core.database import get_redis
from app.core.database import AsyncSessionLocal
import smtplib
from redis.exceptions import ResponseError
from email.message import EmailMessage
from app.core.config import settings
from app.services.loki_handler import LokiHandler, JsonFormatter
from datetime import datetime

logger = logging.getLogger("notification")
logger.setLevel(logging.INFO)

formatter = JsonFormatter()
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

loki_handler = LokiHandler(
    loki_url="http://localhost:3100",
    labels={"app": "notification", "env": "dev"}
)
loki_handler.setFormatter(formatter)
logger.addHandler(loki_handler)

logger.info("notification worker started.")
notify_stream = "moby:notifications"
group_name = "notify-group"

async def ensure_group(r):
    try:
        await r.xgroup_create(notify_stream, group_name, id="0", mkstream=True)
    except ResponseError as e:
        if "BUSYGROUP" in str(e):
            logger.info("Redis group already exists; continuing")
            return
        raise

async def main(consumer_name: str = "notify-1"):
    logger.info("Starting Notification Worker")
    r = get_redis()
    await ensure_group(r)

    while True:
        resp = await r.xreadgroup(
            groupname=group_name,
            consumername=consumer_name,
            streams={notify_stream: ">"},
            count=50,
            block=5000
        )
        if not resp:
            continue

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as s:
            s.ehlo()
            s.starttls()
            s.ehlo()
            s.login("clientmoby@gmail.com", settings.GOOGLE_PASSWORD)
            async with AsyncSessionLocal() as db:
                for _, messages in resp:
                    for msg_id, fields in messages:
                        payload = fields['payload']
                        job = json.loads(payload)

                        try:
                            ah = AlertEventHistory(
                                alert_id=job["alert_id"],
                                confidence="",
                                symbol=job.get("symbol"),
                                price=job.get("price"),
                                size=job.get("size"),
                                exchange=job.get("exchange"),
                                trade_id=job.get("trade_id"),
                                conditions=",".join(job.get("conditions") or []),
                                tape=job.get("tape"),
                                trade_timestamp=datetime.fromisoformat(job["trade_timestamp"]).replace(tzinfo=None) if job.get("trade_timestamp") else None,

                            )
                            db.add(ah)
                        except Exception:
                            logger.exception("Problem adding alert event to DB")

                        if job.get("email_flag") is True:
                            try:
                                msg = EmailMessage()
                                msg["Subject"] = "Moby Alert"
                                msg["From"] = "clientmoby@gmail.com"
                                msg["To"] = job["user_email"]
                                msg.set_content(
                                    f"Moby possible whale activity detected for {job.get('symbol')}, "
                                    f"trade with size: {job.get('size')} exceeding threshold ... (etc)"
                                )
                                s.send_message(msg)
                            except Exception:
                                logger.exception(
                                    "Problem sending alert via email to recipient %s",
                                    job.get("user_email"),
                                )

                        await r.xack(notify_stream, group_name, msg_id)

                try:
                    await db.commit()
                except Exception:
                    logger.exception("Problem committing alert history events")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())