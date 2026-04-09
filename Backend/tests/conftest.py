# This file sets up fixtures needed across multiple tests, such as mock database, mock fastapi app, etc. 

from __future__ import annotations
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock
import pytest
from httpx import ASGITransport, AsyncClient
from fastapi import FastAPI
from app.api.routes.auth import router as auth_router
from app.core.database import get_db
from app.models.models import Users


# mock database fixture
# mocks the database session and associated methds add, commit, referesh
@pytest.fixture
def mock_db() -> AsyncMock:
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def app(mock_db: AsyncMock) -> FastAPI:
    _app = FastAPI()
    _app.include_router(auth_router)

    # overrides get db dependency to yield the mock db above, which will allow adding, committing, refresh
    # we can later assert that these were called
    async def _override_get_db():
        yield mock_db

    _app.dependency_overrides[get_db] = _override_get_db
    return _app

# mock http client so we can affirm status, api calls etc.
@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

# dummy user object with verifiable password hash using auth service function
@pytest.fixture
def fake_user() -> Users:
    from app.core.security import hash_password

    user = Users(
        email="existing@example.com",
        password_hash=hash_password("correct"),
        name="Test User",
        phone="1234567890",
    )
    user.id = 42 
    return user

# mimics scalar_one_or_none on mock database result which is what we use when retrieving an item from the database, specifically, a user object in the auth file
def configure_scalar(mock_db: AsyncMock, return_value):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = return_value
    mock_db.execute.return_value = mock_result