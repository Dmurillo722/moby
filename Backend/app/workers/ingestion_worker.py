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
    symbols_bars: list[str] = []

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
                auth_response = await asyncio.wait_for(ws.recv(), timeout=10)
                logger.info("Alpaca auth response: %s", auth_response)

                await ws.send(json.dumps({
                    "action": "subscribe",
                    "trades": symbols_trades,
                    "quotes": symbols_quotes,
                    "bars": symbols_bars,
                }))

                subscribe_response = await asyncio.wait_for(ws.recv(), timeout=10)
                logger.info("Alpaca subscribe response: %s", subscribe_response)

                async for message in ws:
                    await r.xadd(
                        trades_stream,
                        {"payload": message},
                        maxlen=200_000,
                        approximate=True,
                    )

        except Exception:
            logger.exception("Problem connecting to Alpaca, retrying momentarily")
            retry_count -= 1
            if not retry_count:
                logger.error("Unrecoverable issue connecting to Alpaca, aborting")
                break
            await asyncio.sleep(2)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())