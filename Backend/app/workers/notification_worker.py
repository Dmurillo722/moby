import json
from app.models.models import AlertEventHistory
import asyncio
import logging
from app.core.database import get_redis
from app.core.database import AsyncSessionLocal
import smtplib
from email.message import EmailMessage
from app.core.config import settings

logger = logging.getLogger("eval")
notify_stream = "moby:notifications"
group_name = "notify-group"

# defining stream for trades in case ingestion worker (producer) is still starting
async def ensure_group(r):
    try:
        # using $ for the id makes it so the notification worker only works on notifications, which should avoid duplicate sends
        await r.xgroup_create(notify_stream, group_name, id="$", mkstream=True)
    except Exception:
        logger.error("Problem defining redis group")

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
                                alert_id = job.alert_id,
                                confidence = f"{job.size}"
                            )
                            db.add(ah)
                        except:
                            logger.Error("Problem adding alert event to DB.")

                        if job.email_flag == True:
                            try: 
                                msg = EmailMessage()
                                msg["Subject"] = "Moby Alert"
                                msg["From"] = "clientmoby@gmail.com"
                                msg["To"] = job.user_email
                                message = f"Moby possible whale activity detected for {job.symbol}, trade with size: {job.size} exceeding threshold ... (etc)"
                                msg.set_content(message)
                                s.send_message(msg)
                            except:
                                logger.error(f"Problem sending alert via email to recipient {job.user_email}")
                            
                        await r.xack(notify_stream, group_name, msg_id)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
