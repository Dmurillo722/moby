from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from sqlalchemy import text

DB_URL = f'postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@db/{settings.POSTGRES_DB}'

# postgresql+asyncpg://user:password@db/moby-database
engine = create_async_engine(
    url=DB_URL,
    echo=True
)

async def init_db():
    async with engine.begin() as conn:
        statement = text("""SELECT 'Database Initialized'""")
        result = await conn.execute(statement)
        print(result.all())