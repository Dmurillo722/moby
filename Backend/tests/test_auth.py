"""
Unit tests for POST /auth/register  and  POST /auth/login.

All database & crypto side-effects are mocked.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.models.models import Users

# re-use helpers from conftest
from tests.conftest import configure_scalar


# ========================================================================
#  REGISTER  /auth/register
# ========================================================================

class TestRegister:
    """POST /auth/register"""

    VALID_PAYLOAD = {
        "email": "new@example.com",
        "password": "strongP@ss1",
        "name": "Alice",
        "phone": "5551234567",
    }

    # ---- happy path --------------------------------------------------

    async def test_register_success(
        self, client: AsyncClient, mock_db: AsyncMock
    ):
        """New user is persisted and a UserResponse is returned."""
        configure_scalar(mock_db, None)  # email does NOT exist yet

        # After commit + refresh the ORM object gets an id.
        async def _set_id(obj):
            obj.id = 1

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

    # ---- duplicate email ---------------------------------------------

    async def test_register_duplicate_email(
        self, client: AsyncClient, mock_db: AsyncMock, fake_user: Users
    ):
        """If the email already exists → 400."""
        configure_scalar(mock_db, fake_user)  # email IS found

        resp = await client.post("/auth/register", json=self.VALID_PAYLOAD)

        assert resp.status_code == 400
        assert resp.json()["detail"] == "Email already registered"
        mock_db.add.assert_not_called()

    # ---- password is hashed before storage ---------------------------

    async def test_register_stores_hashed_password(
        self, client: AsyncClient, mock_db: AsyncMock
    ):
        configure_scalar(mock_db, None)

        async def _set_id(obj):
            obj.id = 7

        mock_db.refresh.side_effect = _set_id

        with patch("app.routers.auth.hash_password", return_value="hashed!!") as hp:
            resp = await client.post("/auth/register", json=self.VALID_PAYLOAD)

        assert resp.status_code == 200
        hp.assert_called_once_with("strongP@ss1")

        # The Users object handed to db.add() should carry the hash
        added_obj: Users = mock_db.add.call_args[0][0]
        assert added_obj.password_hash == "hashed!!"

    # ---- schema validation -------------------------------------------

    @pytest.mark.parametrize(
        "missing_field", ["email", "password", "name"]
    )
    async def test_register_missing_required_field(
        self, client: AsyncClient, missing_field: str
    ):
        payload = self.VALID_PAYLOAD.copy()
        del payload[missing_field]

        resp = await client.post("/auth/register", json=payload)
        assert resp.status_code == 422  # Pydantic validation error

    async def test_register_empty_body(self, client: AsyncClient):
        resp = await client.post("/auth/register", json={})
        assert resp.status_code == 422

    async def test_register_invalid_email_format(self, client: AsyncClient):
        payload = {**self.VALID_PAYLOAD, "email": "not-an-email"}
        resp = await client.post("/auth/register", json=payload)
        # Pydantic's EmailStr rejects this
        assert resp.status_code == 422


# ========================================================================
#  LOGIN  /auth/login
# ========================================================================

class TestLogin:
    """POST /auth/login"""

    # ---- happy path --------------------------------------------------

    async def test_login_success(
        self, client: AsyncClient, mock_db: AsyncMock, fake_user: Users
    ):
        """Valid credentials → access token + user details."""
        configure_scalar(mock_db, fake_user)

        resp = await client.post(
            "/auth/login",
            json={"email": "existing@example.com", "password": "correct"},
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["token_type"] == "bearer"
        assert body["access_token"]  # non-empty
        assert body["user_id"] == 42
        assert body["email"] == "existing@example.com"
        assert body["name"] == "Test User"
        assert body["phone"] == "1234567890"

    # ---- wrong email -------------------------------------------------

    async def test_login_unknown_email(
        self, client: AsyncClient, mock_db: AsyncMock
    ):
        configure_scalar(mock_db, None)  # no user found

        resp = await client.post(
            "/auth/login",
            json={"email": "nobody@example.com", "password": "whatever"},
        )

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"

    # ---- wrong password ----------------------------------------------

    async def test_login_wrong_password(
        self, client: AsyncClient, mock_db: AsyncMock, fake_user: Users
    ):
        configure_scalar(mock_db, fake_user)

        resp = await client.post(
            "/auth/login",
            json={"email": "existing@example.com", "password": "WRONG"},
        )

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password"

    # ---- JWT token is well-formed ------------------------------------

    async def test_login_token_contains_sub_claim(
        self, client: AsyncClient, mock_db: AsyncMock, fake_user: Users
    ):
        """The token's 'sub' claim must be the stringified user id."""
        import jwt as pyjwt  # pip install pyjwt if you want this test
        from app.core.config import settings

        configure_scalar(mock_db, fake_user)

        resp = await client.post(
            "/auth/login",
            json={"email": "existing@example.com", "password": "correct"},
        )

        token = resp.json()["access_token"]
        payload = pyjwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        assert payload["sub"] == "42"

    # ---- schema validation -------------------------------------------

    async def test_login_missing_email(self, client: AsyncClient):
        resp = await client.post("/auth/login", json={"password": "x"})
        assert resp.status_code == 422

    async def test_login_missing_password(self, client: AsyncClient):
        resp = await client.post(
            "/auth/login", json={"email": "a@b.com"}
        )
        assert resp.status_code == 422

    async def test_login_empty_body(self, client: AsyncClient):
        resp = await client.post("/auth/login", json={})
        assert resp.status_code == 422