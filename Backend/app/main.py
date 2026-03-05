from fastapi import FastAPI
from app.core.config import settings
from app.core.database import init_db
from app.websocket.alpaca_consumer import AlpacaConsumer
from app.core.database import get_db
from app.websocket.stream_processor import StreamProcessor
from contextlib import asynccontextmanager
from app.api.main import api_router
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import logging

logger = logging.getLogger("uvicorn")

# lifespan, sets up consumer to get data from alpaca and write to redis stream
@asynccontextmanager
async def lifespan(app: FastAPI): 
    await init_db()
    logger.info("DB initialized")
    yield

app = FastAPI(
    lifespan=lifespan,
    title=settings.PROJECT_NAME
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# boilerplate health check
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}

# attaching routers
app.include_router(api_router)
