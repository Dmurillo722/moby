from fastapi import APIRouter, Depends
from app.core.database import get_redis
from app.core.security import get_current_user
import json

router = APIRouter(prefix="/signals", tags=["signals"])

@router.get("/recent")
async def get_recent_signals(
    limit: int = 50,
    user_id: int = Depends(get_current_user)
):
    r = get_redis()
    entries = await r.xrevrange("moby:signals", count=limit)
    return [json.loads(fields["payload"]) for _, fields in entries]