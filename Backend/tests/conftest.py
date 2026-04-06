"""
Shared fixtures used across every test module.

Everything is mocked – zero network, zero Postgres, zero Redis.
"""

from __future__ import annotations

import asyncio
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.core.database import get_db
from app.models.models import Users


# ---------------------------------------------------------------------------
# Fake DB session
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db() -> AsyncMock:
    """
    Returns an ``AsyncMock`` that quacks like ``AsyncSession``.

    Every test is free to configure ``.execute()`` return values
    before handing this to the dependency-override.
    """
    session = AsyncMock()
    # commit / refresh / add are harmless no-ops by default
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


# ---------------------------------------------------------------------------
# FastAPI app wired with the auth router + DI override
# ---------------------------------------------------------------------------

@pytest.fixture
def app(mock_db: AsyncMock) -> FastAPI:
    """
    Builds a throw-away FastAPI app whose ``get_db`` dependency
    is replaced by the mock session above.
    """
    _app = FastAPI()
    _app.include_router(auth_router)

    async def _override_get_db():
        yield mock_db

    _app.dependency_overrides[get_db] = _override_get_db
    return _app


@pytest.fixture
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """
    Async HTTP client pointing at the test app.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Reusable "row-like" user object returned by scalar_one_or_none()
# ---------------------------------------------------------------------------

@pytest.fixture
def fake_user() -> Users:
    """
    A Users model instance that mimics what SQLAlchemy would return
    after a SELECT.  ``password_hash`` matches the string "correct".
    """
    from app.core.security import hash_password

    user = Users(
        email="existing@example.com",
        password_hash=hash_password("correct"),
        name="Test User",
        phone="1234567890",
    )
    user.id = 42          # simulate PK populated by Postgres
    return user


# ---------------------------------------------------------------------------
# Helper: make mock_db.execute().scalar_one_or_none() return a value
# ---------------------------------------------------------------------------

def configure_scalar(mock_db: AsyncMock, return_value):
    """
    Utility – call once in a test to decide what the next
    ``SELECT ... scalar_one_or_none()`` will yield.
    """
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = return_value
    mock_db.execute.return_value = mock_result