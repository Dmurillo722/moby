from app.schemas.schemas import AlpacaTrade
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.models.models import (
    Asset as AssetORM,
    AlertType as AlertTypeORM,
    Alert as AlertORM,
    AlertEventHistory as AlertEventHistoryORM
)
from app.services.email_service import send_email

# proof of concept alert gen
async def trade_size_comparison(trade: AlpacaTrade, db: AsyncSession, logger):
    if trade.size >= 1000: # example
        logger.info("generating alert ...")
        # find users who are subscribed to this symbol and have an alert for "size" and generate an alert for them
        result = await db.execute(
            select(AlertTypeORM.id).where(AlertTypeORM.name == "size")
        )
        alert_type_id = result.scalar_one_or_none()

        if not alert_type_id:
            return False
        
        result = await db.execute(
            select(AssetORM.id).where(AssetORM.symbol == trade.symbol)
        )
        # id for the asset we're generating an alert for
        asset_id = result.scalar_one_or_none()

        if not asset_id:
            return False
        
        # we do selectinload asset so SQLAlchemy will load the asset object associated with the alert as well
        # trying to do this without loading causes issues
        result = await db.execute(
            select(AlertORM)
            .options(selectinload(AlertORM.asset), selectinload(AlertORM.user))
            .where(and_(AlertORM.asset_id == asset_id, AlertORM.alert_type_id == alert_type_id))
        )

       # we now have a list of alerts that need to be triggered, attached to each alert object will be user info
        alerts = result.scalars().all()
        if not alerts:
            return False

        # trigger alerts, sent alerts are logged in the event history
        for alert in alerts:
            symbol = trade.symbol
            logger.info(f'ALERT SENT FOR USER: {alert.user_id} FOR STOCK {symbol} WITH TRADE SIZE {trade.size}')
            ah = AlertEventHistoryORM(
                alert_id = alert.id,
                confidence = f"{trade.size}"
            )
            message = f"Moby possible whale activity detected for {symbol}, trade with size: {trade.size} exceeding threshold ... (etc)"
            send_email(alert.user.email, message, logger)
            db.add(ah)
            await db.commit()
            await db.refresh(ah)

        return True