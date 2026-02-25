from fastapi import APIRouter

# configuring routes to expose to app main
from app.api.routes import finances
from app.api.routes import alerts
from app.api.routes import news
from app.api.routes import sentiment


api_router = APIRouter()
api_router.include_router(finances.router)
api_router.include_router(alerts.router)
api_router.include_router(news.router)
api_router.include_router(sentiment.router)
