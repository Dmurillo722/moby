# PDYANTIC SCHEMAS FOR API HEADERS, RESPONSE FORMAT, etc. 
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from decimal import Decimal

class PostBase(BaseModel):
    model_config = ConfigDict(
        extra="forbid", # not allowing extra fields to come into the schema
        from_attributes=True 
    )

class ResponseBase(BaseModel):
    model_config = ConfigDict(
        extra="forbid", # not allowing extra fields to come into the schema
        from_attributes=True 
    )

# This schema defines what the API expects to return when someone tries to get a Financial Overview
class FinancialOverview(ResponseBase):
    id: int
    asset_id: int
    asset_symbol: Optional[str] = Field(
        None,
        description="Ticker symbol (e.g. AAPL)"
    )

    # Income statement
    total_revenue: Optional[Decimal] = Field(
        None, description="Total revenue"
    )
    revenue_growth: Optional[float] = Field(
        None, description="Revenue growth rate"
    )
    gross_profit: Optional[Decimal]
    operating_income: Optional[Decimal]
    net_income: Optional[Decimal]
    eps_basic: Optional[float]
    eps_diluted: Optional[float]
    total_shares: Optional[Decimal]
    shares_float: Optional[Decimal]
    total_assets: Optional[Decimal]
    total_liabilities: Optional[Decimal]
    total_equity: Optional[Decimal]
    book_value_per_share: Optional[float]
    current_ratio: Optional[float]
    debt_to_equity: Optional[float]
    asset_turnover: Optional[float]

class CreateAlert(PostBase):
    user_id: int
    asset_id: int
    alert_type: str = Field(
        None, 
        description="One of: price_above, price_below, sentiment_change"
    )
    email: bool
    sms: bool
    threshold: int

