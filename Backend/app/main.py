from fastapi import FastAPI
from app.core.config import settings
from app.core.database import init_db
from app.websocket.alpaca_consumer import AlpacaConsumer
from app.websocket.stream_processor import StreamProcessor
from redis.asyncio import Redis
from contextlib import asynccontextmanager
from app.api.main import api_router
import asyncio
import logging

logger = logging.getLogger("uvicorn")

@asynccontextmanager
async def lifespan(app: FastAPI): # initialize resources on application startup
    await init_db()
    logger.info("DB initialized")
    redis = Redis(host="redis", port=6379, decode_responses=True)

    alpaca_consumer = AlpacaConsumer(
        logger=logger,
        redis=redis,
        setting=True,
        symbols_trades=["AAPL"],
        symbols_bars=["AAPL"],
        symbols_quotes=["AAPL"]
    )

    stream_data = {
        "redis_host": "redis",
        "redis_port": 6379,
        "stream_key": "alpaca:stream",
        "group_name": "consumer-group",
        "consumer_name": "consumer-1"
    }

    stream_processor = StreamProcessor(
        logger=logger,
        redis=redis,
        stream_data=stream_data
    )

    consumer_task = asyncio.create_task(
        alpaca_consumer.stream_market_data()
    )
    stream_processor_task = asyncio.create_task(
        stream_processor.process_market_stream()
    )

    logger.info("Alpaca consumer started")

    try:
        yield

    finally:
        logger.info("Shutting Down")
        alpaca_consumer.stop()
        consumer_task.cancel()
        stream_processor_task.cancel()
        await redis.close()


app = FastAPI(
    lifespan=lifespan,
    title=settings.PROJECT_NAME
)

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}

app.include_router(api_router)

# Enable CORS, other middleware, etc.