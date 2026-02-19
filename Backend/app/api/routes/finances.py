from fastapi import Depends, HTTPException
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.schemas.schemas import FinancialOverview as FinancialOverviewSchema
from app.models.models import FinancialOverview as FinancialOverviewORM

router = APIRouter(prefix="/finances", tags=["finances"])

@router.get("/financial_overview/{asset_symbol}", response_model=FinancialOverviewSchema)
async def read_item(asset_symbol: str, db: AsyncSession = Depends(get_db)) -> Any:
    """
    Get Financial Overview By Symbol
    """
    # selecting overview based on asset symbol
    stmt = select(FinancialOverviewORM).where(
        FinancialOverviewORM.asset_symbol == asset_symbol
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Financial overview not recorded for that symbol")
    return item