import asyncio
import json
import logging
import websockets
import time
from app.core.config import settings
from app.core.database import get_redis

logger = logging.getLogger("ingest")
trades_stream = "moby:trades"
bars_stream = "moby:bars"

async def main():
    r = get_redis() 
    alpaca_stream_url = "wss://stream.data.alpaca.markets/v2/iex"
    symbols_trades = ["AAPL"]
    symbols_quotes = []
    symbols_bars = []
    logger.info("Connecting To Alpaca")
    retry_count = 5
    while True:
        try: 
            async with websockets.connect(alpaca_stream_url) as ws:
                await ws.send(json.dumps({"action": "auth", "key": settings.ALPACA_API_KEY, "secret": settings.ALPACA_API_SECRET}))
                subscribe_message = {"action": "subscribe"}
                subscribe_message["trades"] = symbols_trades
                subscribe_message["quotes"] = symbols_quotes
                subscribe_message["bars"] = symbols_bars
                # subscribing to stream based on object values for trade symbols, quote symbols, bar symbols
                await ws.send(json.dumps(subscribe_message))
                logger.info("Subscription success, receiving data from Alpaca")
                async for message in ws:
                    #adding functionality for handling bar data as well
                    events = json.loads(message)

                    if not isinstance(events, list):
                        events = [events]

                    for event in events:
                        msg_type = event.get('T')
                        if msg_type == 'b':#bars
                            await r.xadd(bars_stream, {"payload": json.dumps(event)}, maxlen=200_000, approximate=True)
                        elif msg_type == 't':#trades
                            #event wrapped in a list as the eval worker expects one to loop through 
                            await r.xadd(trades_stream, {"payload": json.dumps([event])}, maxlen=200_000, approximate=True)

        except Exception:
            logger.error("Problem connecting to Alpaca, retrying momentarily ...")
            retry_count -= 1
            if not retry_count:
                logger.error("Unrecoverable issue connecting to Alpaca, aborting ")
            else:
                time.sleep(2)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
