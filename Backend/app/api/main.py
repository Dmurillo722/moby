from fastapi import APIRouter

# configuring routes to expose to app main
from app.api.routes import finances

api_router = APIRouter()
api_router.include_router(finances.router)
