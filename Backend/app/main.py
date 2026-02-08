# project structure based mostly on official fastapi example app 
# https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend/app
from fastapi import FastAPI
from app.core.config import settings
from app.core.database import init_db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI): # initialize resources on application startup
    await init_db()
    print("db initialized ...") # set up global logger
    yield

app = FastAPI(
    lifespan=lifespan,
    title=settings.PROJECT_NAME
)

@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}

# Enable CORS, other middleware, etc.