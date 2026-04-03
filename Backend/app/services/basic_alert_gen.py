from app.schemas.schemas import AlpacaTrade
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.models import (
    Asset as AssetORM,
    AlertType as AlertTypeORM,
    Alert as AlertORM
)

async def trade_size_comparison(trade: AlpacaTrade, db: AsyncSession, logger):
    if trade.size < 1:
        return []

    stmt = (
        select(AlertORM)
        .join(AssetORM, AlertORM.asset_id == AssetORM.id)
        .join(AlertTypeORM, AlertORM.alert_type_id == AlertTypeORM.id)
        .options(selectinload(AlertORM.user))
        .where(
            AssetORM.symbol == trade.symbol,
            AlertTypeORM.name == "size"
        )
    )

    result = await db.execute(stmt)
    alerts = result.scalars().all()
    if not alerts:
        return []

    alert_jobs = []
    for alert in alerts:
        if alert.threshold is not None and trade.size < alert.threshold:
            continue
        alert_jobs.append({
            "alert_id": alert.id,
            "user_email": alert.user.email,
            "email_flag": alert.email,
            "sms_flag": alert.sms,
            "symbol": trade.symbol,
            "price": trade.price,
            "size": trade.size,
            "exchange": trade.exchange,
            "trade_id": trade.trade_id,
            "conditions": trade.conditions,
            "tape": trade.tape,
            "trade_timestamp": trade.timestamp.isoformat() if trade.timestamp else None,
        })

    return alert_jobs