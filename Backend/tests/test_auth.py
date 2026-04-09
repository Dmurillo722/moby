# Unit tests for user auth functionality
from __future__ import annotations
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from httpx import AsyncClient
from app.models.models import Users
from tests.conftest import configure_scalar


class TestRegister:
    # tests for /auth/register

    VALID_PAYLOAD = {
        "email": "new@example.com",
        "password": "strongP@ss1",
        "name": "Alice",
        "phone": "5551234567",
    }

    async def test_register_success(self, client: AsyncClient, mock_db: AsyncMock):
        configure_scalar(mock_db, None) # we pass mock_db and say that scalar one or none should return None, meaning the user doesn't already exist

        # After commit + refresh the ORM object gets an id.
        async def _set_id(obj):
            obj.id = 1

        # user ORM object gets the id configured after refresh since register is valid
        mock_db.refresh.side_effect = _set_id

        resp = await client.post("/auth/register", json=self.VALID_PAYLOAD)

        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == "new@example.com"
        assert body["name"] == "Alice"
        assert body["phone"] == "5551234567"
        assert "id" in body

        # Make sure the session was actually used
        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    async def test_register_duplicate_email(self, client: AsyncClient, mock_db: AsyncMock, fake_user: Users):
        """If the email already exists → 400."""
        configure_scalar(mock_db, fake_user)  # email IS found

        resp = await client.post("/auth/register", json=self.VALID_PAYLOAD)

        assert resp.status_code == 400
        assert resp.json()["detail"] == "Email already registered"
        mock_db.add.assert_not_called()

class TestLogin:
    # tests for /auth/login

    async def test_login_success(self, client: AsyncClient, mock_db: AsyncMock, fake_user: Users):
        """Valid credentials → access token + user details."""
        configure_scalar(mock_db, fake_user)

        resp = await client.post(
            "/auth/login",
            json={"email": "existing@example.com", "password": "correct"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["token_type"] == "bearer"
        assert body["access_token"]
        assert body["user_id"] == 42
        assert body["email"] == "existing@example.com"
        assert body["name"] == "Test User"
        assert body["phone"] == "1234567890"


    async def test_login_unknown_email(self, client: AsyncClient, mock_db: AsyncMock):
        configure_scalar(mock_db, None)

        resp = await client.post(
            "/auth/login",
            json={"email": "nobody@example.com", "password": "whatever"},
        )

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"

