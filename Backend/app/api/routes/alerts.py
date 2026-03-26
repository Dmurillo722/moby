from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
import datetime as dt
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


@router.post("/create_alert", response_model=AlertResponseSchema)
async def create_alert(alert_in: CreateAlertSchema, db: AsyncSession = Depends(get_db)) -> Any:
    # Get or create asset
    result = await db.execute(
        select(AssetORM).where(AssetORM.symbol == alert_in.asset_symbol)
    )
    asset = result.scalar_one_or_none()
    if not asset:
        asset = AssetORM(symbol=alert_in.asset_symbol)
        db.add(asset)
        await db.flush()

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


@router.get("/list", response_model=List[AlertResponseSchema])
async def list_alerts(user_id: int, db: AsyncSession = Depends(get_db)) -> Any:
    result = await db.execute(
        select(AlertORM, AssetORM.symbol, AlertTypeORM.name)
        .join(AssetORM, AlertORM.asset_id == AssetORM.id)
        .join(AlertTypeORM, AlertORM.alert_type_id == AlertTypeORM.id)
        .where(AlertORM.user_id == user_id)
        .order_by(desc(AlertORM.id))
    )
    rows = result.all()
    return [
        AlertResponseSchema(
            id=alert.id,
            user_id=alert.user_id,
            asset_id=alert.asset_id,
            asset_symbol=symbol,
            alert_type=alert_type_name,
            threshold=alert.threshold,
            email=alert.email,
            sms=alert.sms,
        )
        for alert, symbol, alert_type_name in rows
    ]


@router.get("/alert_history", response_model=List[AlertHistoryResponseSchema])
async def get_alert_history(
    user_id: int,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
) -> Any:
    result = await db.execute(
        select(AlertEventHistoryORM)
        .join(AlertORM, AlertEventHistoryORM.alert_id == AlertORM.id)
        .where(AlertORM.user_id == user_id)
        .order_by(desc(AlertEventHistoryORM.sent))
        .limit(limit)
    )
    history = result.scalars().all()
    if not history:
        return []

    out = []
    for event in history:
        sent = event.sent
        if sent is not None and sent.tzinfo is None:
            sent = sent.replace(tzinfo=dt.timezone.utc)
        out.append(AlertHistoryResponseSchema(
            id=event.id,
            alert_id=event.alert_id,
            sent=sent,
            symbol=event.symbol,
            price=event.price,
            size=event.size,
            exchange=event.exchange,
            trade_id=event.trade_id,
            conditions=event.conditions,
            tape=event.tape,
            trade_timestamp=event.trade_timestamp,
        ))
    return out


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