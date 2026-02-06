# project structure based mostly on official fastapi example app 
# https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend/app

from fastapi import FastAPI
from app.core.config import settings

async def lifespan(app: FastAPI): # initialize resources on application startup
    pass

app = FastAPI(
    lifespan=lifespan,
    title=settings.PROJECT_NAME
)

# Enable CORS, other middleware, etc.