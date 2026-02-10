from typing import Optional
import datetime

from sqlalchemy import Boolean, DateTime, Double, ForeignKeyConstraint, Index, Integer, PrimaryKeyConstraint, String, UniqueConstraint, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# Python code for ORM models generated directly from SQL using sqlacaodegen package

class Base(DeclarativeBase):
    pass


class Asset(Base):
    __tablename__ = 'asset'
    __table_args__ = (
        PrimaryKeyConstraint('id', name='asset_pkey'),
        UniqueConstraint('symbol', name='asset_symbol_key'),
        Index('idx_asset_symbol', 'symbol')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    symbol: Mapped[Optional[str]] = mapped_column(String(256))

    alert: Mapped[list['Alert']] = relationship('Alert', back_populates='asset')
    market_data: Mapped[list['MarketData']] = relationship('MarketData', back_populates='asset')
    sentiment_data: Mapped[list['SentimentData']] = relationship('SentimentData', back_populates='asset')


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
    __table_args__ = (
        ForeignKeyConstraint(['asset_id'], ['asset.id'], name='alert_asset_id_fkey'),
        ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name='alert_user_id_fkey'),
        PrimaryKeyConstraint('id', name='alert_pkey')
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    asset_id: Mapped[int] = mapped_column(Integer, nullable=False)
    alert_type: Mapped[str] = mapped_column(String(256), nullable=False)
    email: Mapped[bool] = mapped_column(Boolean, nullable=False)
    sms: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('now()'))
    threshold: Mapped[Optional[float]] = mapped_column(Double(53))

    asset: Mapped['Asset'] = relationship('Asset', back_populates='alert')
    user: Mapped['Users'] = relationship('Users', back_populates='alert')
    alert_event_history: Mapped[list['AlertEventHistory']] = relationship('AlertEventHistory', back_populates='alert')


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
    sent: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, server_default=text('now()'))

    alert: Mapped['Alert'] = relationship('Alert', back_populates='alert_event_history')
