from fastapi import Depends, HTTPException
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.schemas.schemas import CreateAlert as CreateAlertSchema
from app.models.models import Asset as AssetORM
router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post(f"/create_alert", response_model=CreateAlertSchema)
def create_alert(alert_in: CreateAlertSchema, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Create an alert using user id, symbol, and other config I think eventually instead of passing userID it'd be auth token?
    """
    pass

    

# creating user alert
    # user must select an asset that exists in the database
    # string for alert type (large transaction)
    # do they want through email or sms
    # and a threshold for determining when


# get someone's recent alert details (alert history)


