from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.schemas import (
    CreateAlert as CreateAlertSchema,
    AlertHistoryResponseSchema,
    AlertResponseSchema,
)
from app.models.models import (
    Asset as AssetORM,
    AlertType as AlertTypeORM,
    Alert as AlertORM,
    AlertEventHistory as AlertEventHistoryORM,
)

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post(f"/create_alert", response_model=AlertResponseSchema)
async def create_alert(alert_in: CreateAlertSchema, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Create an alert using user id, symbol, and other config I think eventually instead of passing userID it'd be auth token?
    """
    # asset
    result = await db.execute(
        select(AssetORM).where(AssetORM.symbol == alert_in.asset_symbol)
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset Symbol Not Found")

    # alert type
    result = await db.execute(
        select(AlertTypeORM).where(AlertTypeORM.name == alert_in.alert_type)
    )
    alert_type = result.scalar_one_or_none()
    if not alert_type:
        raise HTTPException(status_code=404, detail="Alert Type Not Configured")

    alert = AlertORM(
        user_id=alert_in.user_id,
        asset_id=asset.id,
        alert_type_id=alert_type.id,
        threshold=alert_in.threshold,
        email=alert_in.email,
        sms=alert_in.sms,
    )

    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    return AlertResponseSchema(
        id=alert.id,
        user_id=alert.user_id,
        asset_id=asset.id,
        asset_symbol=asset.symbol,
        alert_type=alert_type.name,
        threshold=alert.threshold,
        email=alert.email,
        sms=alert.sms,
    )

# returns alert history by user id
@router.get("/alert_history", response_model=List[AlertHistoryResponseSchema])
async def get_alert_history(user_id: int, db: AsyncSession = Depends(get_db)) -> Any:
    result = await db.execute(
        select(AlertORM.id).where(AlertORM.user_id == user_id)
    )
    alert_ids = result.scalars().all()
    if not alert_ids:
        return []
    result = await db.execute(
        select(AlertEventHistoryORM).where(AlertEventHistoryORM.alert_id.in_(alert_ids))
                                           .order_by(AlertEventHistoryORM.sent)
                                           .limit(3)
    );
    history = result.scalars().all()
    if not history:
        return []
    result = []
    for event in history:
        result.append(AlertHistoryResponseSchema(
            id=event.id,
            alert_id=event.alert_id,
            confidence=event.confidence,
            sent=event.sent
        ))
    return result

# delete alert based on alert_id, propogates to alert history
@router.delete("/delete_alert/{alert_id}", status_code=204)
async def delete_alert(alert_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AlertORM).where(AlertORM.id == alert_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Alert with this ID does not exist")

    await db.delete(item)
    await db.commit()
    return None