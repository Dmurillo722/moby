from app.schemas.schemas import AlpacaTrade
from redis.exceptions import ResponseError
import json
import asyncio
import logging
from app.services.loki_handler import LokiHandler, JsonFormatter
from app.core.database import get_redis
from app.core.database import AsyncSessionLocal
from app.services.basic_alert_gen import trade_size_comparison

logger = logging.getLogger("eval")
logger.setLevel(logging.INFO)

formatter = JsonFormatter()
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

loki_handler = LokiHandler(
    loki_url="http://localhost:3100",
    labels={"app": "eval", "env": "dev"}
)
loki_handler.setFormatter(formatter)
logger.addHandler(loki_handler)

logger.info("Eval worker started.")

trades_stream = "moby:trades"
notify_stream = "moby:notifications"
group_name = "eval-group"

async def ensure_group(r):
    try:
        await r.xgroup_create(trades_stream, group_name, id="0", mkstream=True)
    except ResponseError as e:
        if "BUSYGROUP" in str(e):
            logger.info("Redis group already exists; continuing")
            return
        raise

async def publish_jobs(r, jobs: list[dict]):
    for job in jobs:
        await r.xadd(notify_stream, {"payload": json.dumps(job)})

async def main(consumer_name: str = "eval-1"):
    logger.info("Starting Eval Worker")
    r = get_redis()
    await ensure_group(r)
    while True:
        resp = await r.xreadgroup(
            groupname=group_name,
            consumername=consumer_name,
            streams={trades_stream: ">"},
            count=50,
            block=5000
        )
        if not resp:
            continue

        
        for _, messages in resp:
            for msg_id, fields in messages:
                payload = fields['payload']
                events = json.loads(payload)

                notification_jobs = []
                async with AsyncSessionLocal() as db:
                    for event in events:
                        if event.get("T") != "t":
                            continue
                        try:
                            trade = AlpacaTrade(**event)
                        except Exception:
                            logger.warning("Schema couldn't validate trade message, skipping")
                            continue
                        try:
                            jobs = await trade_size_comparison(trade, db, logger=logger)
                        except Exception:
                            logger.exception("Problem doing size comparison analysis for trade")
                            continue

                        if jobs:
                            notification_jobs.extend(jobs)

                if notification_jobs:
                    await publish_jobs(r, notification_jobs)

                await r.xack(trades_stream, group_name, msg_id)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())