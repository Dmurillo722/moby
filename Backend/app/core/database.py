from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.models.models import Base

DB_URL = f'postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@db/{settings.POSTGRES_DB}'

engine = create_async_engine(
    url=DB_URL,
    echo=True
)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("DB INITIALIZED")