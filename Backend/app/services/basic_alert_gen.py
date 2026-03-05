from app.schemas.schemas import AlpacaTrade
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.models import (
    Asset as AssetORM,
    AlertType as AlertTypeORM,
    Alert as AlertORM
)

# proof of concept alert gen
async def trade_size_comparison(trade: AlpacaTrade, db: AsyncSession, logger):
    if trade.size >= 200: # example
        logger.info("generating alert ...")
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
            alert_jobs.append({
                "alert_id": alert.id,
                "user_email": alert.user.email,
                "symbol": trade.symbol,
                "email_flag": alert.email,
                "sms_flag": alert.sms,
                "size": trade.size
            })
            
        return alert_jobs