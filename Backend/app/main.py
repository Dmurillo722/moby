from fastapi import FastAPI
from app.core.config import settings
from app.core.database import init_db
from app.websocket.alpaca_consumer import AlpacaConsumer
from app.websocket.stream_processor import StreamProcessor
from contextlib import asynccontextmanager
from app.api.main import api_router
import asyncio
import logging

logger = logging.getLogger("uvicorn")

# lifespan, sets up consumer to get data from alpaca and write to redis stream
@asynccontextmanager
async def lifespan(app: FastAPI): 
    await init_db()
    logger.info("DB initialized")
    queue = asyncio.Queue(maxsize=5000) # using this instead of redis stream

    alpaca_consumer = AlpacaConsumer(
        logger=logger,
        queue=queue,
        setting=True,
        symbols_trades=["AAPL"],
        symbols_bars=["AAPL"],
        symbols_quotes=["AAPL"]
    )

    stream_processor = StreamProcessor(
        logger=logger,
        worker_count=4, # we'll see what works best
        queue=queue
    )

    consumer_task = asyncio.create_task(
        alpaca_consumer.stream_market_data()
    )
    logger.info("Alpaca consumer started")

    await stream_processor.start()
    logger.info("Alpaca stream processor started")

    try:
        yield

    finally:
        logger.info("Shutting Down")
        alpaca_consumer.stop()
        consumer_task.cancel()
        await stream_processor.stop()

app = FastAPI(
    lifespan=lifespan,
    title=settings.PROJECT_NAME
)

# boilerplate health check
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}

# attaching routers
app.include_router(api_router)
