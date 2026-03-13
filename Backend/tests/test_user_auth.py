import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from app.services.basic_alert_gen import trade_size_comparison
from app.schemas.schemas import AlpacaTrade
