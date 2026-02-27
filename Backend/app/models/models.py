from typing import Optional
import datetime

from sqlalchemy import Boolean, ForeignKey, Numeric, DateTime, Double, ForeignKeyConstraint, Index, Integer, PrimaryKeyConstraint, String, UniqueConstraint, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# Python code for ORM models generated directly from SQL using sqlacaodegen package
# After changing this file, follow instructions for updating the schema through alembic

class Base(DeclarativeBase):
    pass

class Asset(Base):
    __tablename__ = 'asset'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='asset_pkey'),
        UniqueConstraint('symbol', name='asset_symbol_unique'),
        Index('idx_asset_symbol', 'symbol')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[str] = mapped_column(String(256))

    alert: Mapped[list['Alert']] = relationship('Alert', back_populates='asset')
    market_data: Mapped[list['MarketData']] = relationship('MarketData', back_populates='asset')
    sentiment_data: Mapped[list['SentimentData']] = relationship('SentimentData', back_populates='asset')
    financial_overview: Mapped['FinancialOverview'] = relationship(
        'FinancialOverview',
        back_populates='asset',
        cascade="all, delete-orphan")

class Users(Base):
    __tablename__ = 'users'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='users_pkey'),
        UniqueConstraint('email', name='users_email_key')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(256), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(256))
    phone: Mapped[Optional[str]] = mapped_column(String(256))
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('now()'))
    tier: Mapped[Optional[str]] = mapped_column(String(256))

    alert: Mapped[list['Alert']] = relationship('Alert', back_populates='user')


class Alert(Base):
    __tablename__ = 'alert'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    asset_id: Mapped[int] = mapped_column(ForeignKey("asset.id"), nullable=False)
    alert_type_id: Mapped[int] = mapped_column(
        ForeignKey("alert_type.id"),
        nullable=False
    )

    threshold: Mapped[Optional[float]]
    email: Mapped[bool]
    sms: Mapped[bool]

    user = relationship("Users", back_populates="alert")
    asset = relationship("Asset", back_populates="alert")
    alert_type = relationship("AlertType", back_populates="alerts")
    alert_event_history = relationship('AlertEventHistory', cascade="all, delete", passive_deletes=True, back_populates='alert')


class MarketData(Base):
    __tablename__ = 'market_data'
    __table_args__ = (
        ForeignKeyConstraint(['asset_id'], ['asset.id'], name='market_data_asset_id_fkey'),
        PrimaryKeyConstraint('id', name='market_data_pkey'),
        Index('idx_market_data_asset_time', 'asset_id', 'time')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Optional[float]] = mapped_column(Double(53))
    volume: Mapped[Optional[float]] = mapped_column(Double(53))
    time: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('now()'))

    asset: Mapped['Asset'] = relationship('Asset', back_populates='market_data')


class SentimentData(Base):
    __tablename__ = 'sentiment_data'
    __table_args__ = (
        ForeignKeyConstraint(['asset_id'], ['asset.id'], name='sentiment_data_asset_id_fkey'),
        PrimaryKeyConstraint('id', name='sentiment_data_pkey')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(Integer, nullable=False)
    sentiment_rating: Mapped[int] = mapped_column(Integer, nullable=False)
    time: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('now()'))
    
    asset: Mapped['Asset'] = relationship('Asset', back_populates='sentiment_data')


class AlertEventHistory(Base):
    __tablename__ = 'alert_event_history'
    __table_args__ = (
        ForeignKeyConstraint(['alert_id'], ['alert.id'], ondelete='CASCADE', name='alert_event_history_alert_id_fkey'),
        PrimaryKeyConstraint('id', name='alert_event_history_pkey')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_id: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence: Mapped[str] = mapped_column(String(256), nullable=False)
    sent: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('now()'))
    alert: Mapped['Alert'] = relationship('Alert', back_populates='alert_event_history')

class FinancialOverview(Base):
    __tablename__ = 'financial_overview'
    __table_args__ = (
        ForeignKeyConstraint(['asset_id'], ['asset.id'], ondelete='CASCADE', name='financial_overview_asset_id_fkey'),
        PrimaryKeyConstraint('id', name='financial_overview_pkey')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(Integer, nullable=False)
    asset_symbol: Mapped[Optional[str]] = mapped_column(String(256))
    total_revenue: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    revenue_growth: Mapped[Optional[float]] = mapped_column(Double(53))
    gross_profit: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    operating_income: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    net_income: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    eps_basic: Mapped[Optional[float]] = mapped_column(Double(53))
    eps_diluted: Mapped[Optional[float]] = mapped_column(Double(53))
    total_shares: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    shares_float: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    total_assets: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    total_liabilities: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    total_equity: Mapped[Optional[float]] = mapped_column(Numeric(20, 2))
    book_value_per_share: Mapped[Optional[float]] = mapped_column(Double(53))
    current_ratio: Mapped[Optional[float]] = mapped_column(Double(53))
    debt_to_equity: Mapped[Optional[float]] = mapped_column(Double(53))
    asset_turnover: Mapped[Optional[float]] = mapped_column(Double(53))
    asset: Mapped['Asset'] = relationship('Asset', back_populates='financial_overview')

class AlertType(Base):
    __tablename__ = 'alert_type'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(256), unique=True)
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="alert_type")


# example financial overview
'''
totalRevenue: '385.67B',
    revenueGrowth: '29.41%',
    grossProfit: '206.14B',
    operatingIncome: '141.87B',
    netIncome: '117.71B',
    epsBasic: '7.60',
    epsDiluted: '2.44',
    totalShares: '14.65B',
    sharesFloat: '14.67B',
    balanceSheet: {
      totalAssets: '378.30B',
      totalLiabilities: '293.31B',
      totalEquity: '85.17B',
    },
    bookValuePerShare: '6.00',
    currentRatio: '0.97',
    debtToEquity: '1.03',
    assetTurnover: '1.20',
'''
