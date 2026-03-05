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

logger = logging.getLogger("eval")
notify_stream = "moby:notifications"
group_name = "notify-group"

# defining stream for trades in case ingestion worker (producer) is still starting
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
                                confidence=str(job.get("size", "")),
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
                                message = (
                                    f"Moby possible whale activity detected for {job.get('symbol')}, "
                                    f"trade with size: {job.get('size')} exceeding threshold ... (etc)"
                                )
                                msg.set_content(message)
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
