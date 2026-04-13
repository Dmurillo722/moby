#consume from moby:bars and maintain per-symbol in-memory state (the deques in the Rollingvolumetracker and the volumeAnalyzer) and publishes detected signals to a new stream moby:signals
from collections import deque
from datetime import datetime, timedelta, timezone
import json
import asyncio
from app.core.database import AsyncSessionLocal, get_redis
import logging
from app.schemas.schemas import AlpacaBar
from redis.exceptions import RedisError, ResponseError
from app.services.loki_handler import LokiHandler, JsonFormatter
from app.core.database import get_redis
from detection_engine.volume.analyzer import SymbolAnalyzer, default_analyzer



"""
Pure analysis process meant to read bars, run analysis, and publish signals that meet some determined threshold. 
This worker won't interact with the database, instead just consuming bar data and telling the other workers when to send the alerts
"""

logger = logging.getLogger("detection")
logger.setLevel(logging.INFO)

formatter = JsonFormatter()
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

loki_handler = LokiHandler(
    loki_url="http://localhost:3100",
    labels={"app": "detection", "env": "dev"}
)
loki_handler.setFormatter(formatter)
logger.addHandler(loki_handler)

logger.info("Detection worker started.")

bars_stream = "moby:bars"
signals_stream = "moby:signals"
group_name = "detection-group"

publish_threshold = {"strong", "moderate"}

#copy of the version used in eval but with the stream name changed to bars, we can also add some error handling here in case the stream doesn't exist yet for some reason, or the redis connection is having issues, etc.
#maybe better to have a separate file with parametrized versions of helpers in the future?
async def ensure_group(r):
    try:
        await r.xgroup_create(bars_stream, group_name, id="0", mkstream=True)
    except ResponseError as e:
        if "BUSYGROUP" in str(e):
            logger.info("Redis group already exists; continuing")
            return
        raise

async def publish_jobs(r, jobs: list[dict]):
    for job in jobs:
        await r.xadd(
            signals_stream, 
            {
                "payload": json.dumps(job, default=str)
            },
        )


async def main(consumer_name: str = "detection-1"):
    logger.info("Starting Detection Engine Worker")
    r = get_redis()
    await ensure_group(r)

    # symbol : analyzer object mapping to maintain state across bars for each symbol we are tracking
    # automatically updated when bars come in for symbols we have subscribed to
    analyzerDict = {}

    while True:
        resp = await r.xreadgroup(
            groupname = group_name,
            consumername = consumer_name,
            streams = {bars_stream: ">"}, 
            #max number of minute bars we will use at any given time is 30
            count = 900,
            #if we have no bars to consume after 5 minutes, we will check again in 5 seconds
            block = 5000
        )

        if not resp:
            continue

        notification_jobs = [] 

        #resp is a list of tuples [(stream_name, [(msg_id, {field: value})])]
        for _, messages in resp:
            #messages is a list of tuples [(msg_id, {field: value})]
            for msg_id, fields in messages:
            #payload is a json string defining the bar, parse it for bar data
                payload = fields['payload']
                bars = json.loads(payload)
                #bars will be list regardless if there is only one or more
                events = bars if isinstance(bars, list) else [bars]

                
                for event in events:
                    #our analyzer only uses minute bars
                    if event.get("T") != "b":
                        continue
                    
                    try:
                        event["t"] = datetime.fromisoformat(event["t"].replace("Z", "+00:00"))
                    except (ValueError, TypeError, KeyError):
                        logger.warning("Malformed timestamp for bar, skipping")
                        continue

                        
                    symbol = event.get("S")

                    if not symbol:
                        continue
                    #add symbol to analyzer dict if not already there
                    #for now until we implement more user customization of analysis we can have the analyzer default
                    #to using all potentially relevant timeframes 
                    # (we can also have this be expected behavior but display more info to the user)

                    if symbol not in analyzerDict:
                        analyzerDict[symbol] = default_analyzer(symbol)
                        logger.info("Created analyzer for: %s", symbol)

                        
                    #process the bar through the relevant analyzer
                    #idea is to update the relevant analyzer object and return the results upon
                    #each bar being processed. We can add thesese results to another dict with
                    #each of the corresponding symbols and then have the alerts gen
                    try:
                        result = analyzerDict[symbol].process_bar(event)
                           
                    except Exception:
                        logger.exception("Analysis failed for %s", symbol)
                        continue
                        
                    logger.info(event)

                    strength = result["convergence"].get("signal_strength", "none")
                        
                    if strength in publish_threshold:
                        notification_jobs.append(result)
                        logger.info(
                            "SIGNAL %s strength=%s dir=%s",
                             symbol,
                            strength,
                            result["convergence"].get("ofi_direction")
                        )

            await r.xack(bars_stream, group_name, msg_id)
                    
        if notification_jobs:
            #temporary debugging logging statment
            logging.info("Publishing jobs for bars")
            await publish_jobs(r, notification_jobs)
                    
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
                    
                    
                    