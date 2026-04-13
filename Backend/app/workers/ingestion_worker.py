import asyncio
import json
import logging
import websockets
from app.core.config import settings
from app.core.database import get_redis, AsyncSessionLocal
from app.models.models import Asset as AssetORM
from sqlalchemy import select
from app.services.loki_handler import LokiHandler, JsonFormatter

logger = logging.getLogger("ingest")
logger.setLevel(logging.INFO)
trades_stream = "moby:trades"
bars_stream = "moby:bars"

stream_routing = {
    "t": trades_stream,
    "b": bars_stream
}

formatter = JsonFormatter()
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

loki_handler = LokiHandler(
    loki_url="http://localhost:3100",
    labels={"app": "ingest", "env": "dev"}
)
loki_handler.setFormatter(formatter)
logger.addHandler(loki_handler)

logger.info("Ingest worker started.")


async def get_symbols_from_db() -> list[str]:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AssetORM.symbol))
        symbols = result.scalars().all()
    if not symbols:
        logger.warning("No assets found in DB — defaulting to AAPL")
        return ["AAPL"]
    logger.info("Loaded symbols from DB: %s", symbols)
    return list(symbols)


async def main():
    r = get_redis()
    alpaca_stream_url = "wss://stream.data.alpaca.markets/v2/iex"

    symbols_trades = await get_symbols_from_db()
    symbols_quotes: list[str] = []
    symbols_bars = await get_symbols_from_db()
    #list[str] = []

    logger.info("Connecting to Alpaca, subscribing to: %s", symbols_trades)

    retry_count = 5
    while True:
        try:
            async with websockets.connect(alpaca_stream_url) as ws:
                await ws.send(json.dumps({
                    "action": "auth",
                    "key": settings.ALPACA_API_KEY,
                    "secret": settings.ALPACA_API_SECRET,
                }))
                await ws.send(json.dumps({
                    "action": "subscribe",
                    "trades": symbols_trades,
                    "quotes": symbols_quotes,
                    "bars": symbols_bars,
                }))
                logger.info("Subscription success, receiving data from Alpaca")
                async for message in ws:

                    events = json.loads(message)
                    if not isinstance(events, list):
                        events = [events]
                    
                    for event in events:
                        msg_type = event.get("T")
                        if msg_type == 'b':#bars
                            logger.info("Received bar event: %s", event)
                            await r.xadd(bars_stream, {"payload": json.dumps(event)}, maxlen=200_000, approximate=True)
                        elif msg_type == 't':#trades
                            #logger.info("Received trade event: %s", event)
                            await r.xadd(trades_stream, {"payload": json.dumps([event])}, maxlen=200_000, approximate=True)
                    
                        #await r.xadd(
                        ##    trades_stream,
                        #    {"payload": message},
                        #    maxlen=200_000,
                        #    approximate=True,
                        #)

        except Exception:
            logger.error("Problem connecting to Alpaca, retrying momentarily...")
            retry_count -= 1
            if not retry_count:
                logger.error("Unrecoverable issue connecting to Alpaca, aborting")
                break
            await asyncio.sleep(2)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())