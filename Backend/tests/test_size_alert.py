import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from app.services.basic_alert_gen import trade_size_comparison
from app.schemas.schemas import AlpacaTrade

# sets up db mock for rest of file
@pytest.fixture
def mock_db():
    return AsyncMock()

# sets up mock logger for the rest of file
@pytest.fixture
def mock_logger():
    return MagicMock()


@pytest.mark.asyncio
async def test_trade_below_threshold_returns_none(mock_db, mock_logger):
    # mock trade
    trade = AlpacaTrade(type="t", symbol="AAPL", trade_id=0, exchange="", price=100.0, size=100, conditions=[], tape="", timestamp=datetime.now())

    result = await trade_size_comparison(trade, mock_db, mock_logger, size=1000)
    # asset that our logger wasn't used
    mock_logger.info.assert_not_called()

    assert result is None
    # assert that nothing was executed against our mock database (since the trade price didn't exceed the threshold)
    mock_db.execute.assert_not_called()

@pytest.mark.asyncio
async def test_trade_above_threshold_no_alerts(mock_db, mock_logger):
    trade = AlpacaTrade(type="t", symbol="AAPL", trade_id=0, exchange="", price=100.0, size=1100, conditions=[], tape="", timestamp=datetime.now())

    mock_result = MagicMock()
    # mock return value from db call, saying that we have no alerts configured for this stock in the db
    mock_result.scalars.return_value.all.return_value = []

    mock_db.execute.return_value = mock_result

    result = await trade_size_comparison(trade, mock_db, mock_logger, size=1000)
    mock_logger.info.assert_called_with("generating alert ...")
    assert result == []
    # assert that we checked the db for alerts
    mock_db.execute.assert_called_once()

@pytest.mark.asyncio
async def test_trade_generates_alert_jobs(mock_db, mock_logger):
    trade = AlpacaTrade(type="t", symbol="AAPL", trade_id=0, exchange="", price=100.0, size=1100, conditions=[], tape="", timestamp=datetime.now())

    mock_user = MagicMock()
    mock_user.email = "test@example.com"

    mock_alert = MagicMock()
    mock_alert.id = 1
    mock_alert.user = mock_user
    mock_alert.email = True
    mock_alert.sms = False

    mock_result = MagicMock()
    # trade size exceeds threshold and we find that mock alert is returned
    mock_result.scalars.return_value.all.return_value = [mock_alert]

    mock_db.execute.return_value = mock_result

    result = await trade_size_comparison(trade, mock_db, mock_logger, size=1000)
    mock_logger.info.assert_called_with("generating alert ...") 
    # asset that the correct notification job gets created
    assert result == [
        {
            "alert_id": 1,
            "user_email": "test@example.com",
            "symbol": "AAPL",
            "email_flag": True,
            "sms_flag": False,
            "size": 1100
        }
    ]

