"""
Unit tests for the notification / Gmail worker.

SMTP, Redis and Postgres are fully mocked – nothing leaves the process.

Adjust the import path below if your worker lives elsewhere:
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from unittest.mock import (
    AsyncMock,
    MagicMock,
    call,
    patch,
)

import pytest
from redis.exceptions import ResponseError

# ---- Adjust this import to wherever the worker module actually lives ----
WORKER_MODULE = "app.workers.notification_worker"

# We import the two standalone helpers directly for focused testing.
# The `main()` coroutine is tested by patching everything around it.
from app.workers.notification_worker import ensure_group, main, notify_stream, group_name


# ========================================================================
#  FIXTURES
# ========================================================================

def _make_job(*, email_flag: bool = True, symbol: str = "AAPL") -> dict:
    """Build a realistic message payload."""
    return {
        "alert_id": 99,
        "symbol": symbol,
        "price": 188.50,
        "size": 500_000,
        "exchange": "XNYS",
        "trade_id": "t-001",
        "conditions": ["@", "T"],
        "tape": "A",
        "trade_timestamp": datetime.utcnow().isoformat(),
        "email_flag": email_flag,
        "user_email": "whale@example.com",
    }


def _redis_response(job: dict, msg_id: bytes = b"1-0"):
    """Wrap *job* in the shape returned by ``XREADGROUP``."""
    return [
        (
            notify_stream,
            [(msg_id, {"payload": json.dumps(job)})],
        )
    ]


@pytest.fixture
def mock_redis() -> AsyncMock:
    r = AsyncMock()
    r.xgroup_create = AsyncMock()
    r.xreadgroup = AsyncMock()
    r.xack = AsyncMock()
    return r


@pytest.fixture
def mock_smtp() -> MagicMock:
    """Mocks the ``smtplib.SMTP`` context-manager."""
    smtp_instance = MagicMock()
    smtp_instance.__enter__ = MagicMock(return_value=smtp_instance)
    smtp_instance.__exit__ = MagicMock(return_value=False)
    return smtp_instance


@pytest.fixture
def mock_db_session() -> AsyncMock:
    session = AsyncMock()
    session.add = MagicMock()
    session.commit = AsyncMock()
    # Make it usable as `async with AsyncSessionLocal() as db:`
    session.__aenter__ = AsyncMock(return_value=session)
    session.__aexit__ = AsyncMock(return_value=False)
    return session


# ========================================================================
#  ensure_group()
# ========================================================================

class TestEnsureGroup:

    async def test_creates_new_group(self, mock_redis: AsyncMock):
        """First run – group does not exist yet."""
        await ensure_group(mock_redis)

        mock_redis.xgroup_create.assert_awaited_once_with(
            notify_stream, group_name, id="0", mkstream=True
        )

    async def test_ignores_busygroup_error(self, mock_redis: AsyncMock):
        """Group already exists → log and continue."""
        mock_redis.xgroup_create.side_effect = ResponseError(
            "BUSYGROUP Consumer Group name already exists"
        )

        # Must NOT raise
        await ensure_group(mock_redis)

    async def test_propagates_other_redis_errors(self, mock_redis: AsyncMock):
        """Non-BUSYGROUP Redis errors must bubble up."""
        mock_redis.xgroup_create.side_effect = ResponseError("WRONGTYPE oops")

        with pytest.raises(ResponseError, match="WRONGTYPE"):
            await ensure_group(mock_redis)


# ========================================================================
#  main()  –  message processing + email sending
# ========================================================================

class TestMainWorkerLoop:
    """
    Each test lets the ``while True`` loop execute *once* and then
    breaks it with ``asyncio.CancelledError`` on the second
    ``xreadgroup`` call.
    """

    def _patch_infrastructure(
        self,
        mock_redis: AsyncMock,
        mock_smtp: MagicMock,
        mock_db_session: AsyncMock,
        jobs: list[dict],
    ):
        """
        Returns a stack of ``patch`` context-managers that wire every
        external dependency to our mocks.
        """
        # First xreadgroup → real data; second → break out
        mock_redis.xreadgroup.side_effect = [
            _redis_response(jobs[0]) if jobs else [],
            asyncio.CancelledError(),
        ]

        patches = {
            "redis": patch(f"{WORKER_MODULE}.get_redis", return_value=mock_redis),
            "group": patch(f"{WORKER_MODULE}.ensure_group", new_callable=AsyncMock),
            "smtp": patch(f"{WORKER_MODULE}.smtplib.SMTP", return_value=mock_smtp),
            "db": patch(f"{WORKER_MODULE}.AsyncSessionLocal", return_value=mock_db_session),
        }
        return patches

    # ---- happy path: email sent + DB row created ---------------------

    async def test_processes_message_and_sends_email(
        self,
        mock_redis: AsyncMock,
        mock_smtp: MagicMock,
        mock_db_session: AsyncMock,
    ):
        job = _make_job(email_flag=True)
        patches = self._patch_infrastructure(
            mock_redis, mock_smtp, mock_db_session, [job]
        )

        with (
            patches["redis"],
            patches["group"],
            patches["smtp"],
            patches["db"],
        ):
            with pytest.raises(asyncio.CancelledError):
                await main()

        # SMTP assertions
        mock_smtp.send_message.assert_called_once()
        sent_msg = mock_smtp.send_message.call_args[0][0]
        assert sent_msg["To"] == "whale@example.com"
        assert sent_msg["Subject"] == "Moby Alert"

        # DB assertions
        mock_db_session.add.assert_called_once()
        added = mock_db_session.add.call_args[0][0]
        assert added.alert_id == 99
        assert added.symbol == "AAPL"
        mock_db_session.commit.assert_awaited_once()

        # Redis ACK
        mock_redis.xack.assert_awaited_once()

    # ---- email_flag=False → no email ---------------------------------

    async def test_skips_email_when_flag_false(
        self,
        mock_redis: AsyncMock,
        mock_smtp: MagicMock,
        mock_db_session: AsyncMock,
    ):
        job = _make_job(email_flag=False)
        patches = self._patch_infrastructure(
            mock_redis, mock_smtp, mock_db_session, [job]
        )

        with (
            patches["redis"],
            patches["group"],
            patches["smtp"],
            patches["db"],
        ):
            with pytest.raises(asyncio.CancelledError):
                await main()

        mock_smtp.send_message.assert_not_called()
        # DB row should still be created
        mock_db_session.add.assert_called_once()

    # ---- SMTP failure is caught, doesn't crash worker ----------------

    async def test_smtp_failure_is_logged_and_swallowed(
        self,
        mock_redis: AsyncMock,
        mock_smtp: MagicMock,
        mock_db_session: AsyncMock,
    ):
        job = _make_job(email_flag=True)
        mock_smtp.send_message.side_effect = OSError("SMTP timeout")
        patches = self._patch_infrastructure(
            mock_redis, mock_smtp, mock_db_session, [job]
        )

        with (
            patches["redis"],
            patches["group"],
            patches["smtp"],
            patches["db"],
        ):
            with pytest.raises(asyncio.CancelledError):
                await main()

        # Worker must still ACK and commit despite email failure
        mock_redis.xack.assert_awaited_once()
        mock_db_session.commit.assert_awaited_once()

    # ---- DB commit failure is caught ---------------------------------

    async def test_db_commit_failure_is_logged(
        self,
        mock_redis: AsyncMock,
        mock_smtp: MagicMock,
        mock_db_session: AsyncMock,
    ):
        job = _make_job(email_flag=False)
        mock_db_session.commit.side_effect = Exception("PG gone")
        patches = self._patch_infrastructure(
            mock_redis, mock_smtp, mock_db_session, [job]
        )

        with (
            patches["redis"],
            patches["group"],
            patches["smtp"],
            patches["db"],
        ):
            # Worker should NOT crash – the exception is caught internally
            with pytest.raises(asyncio.CancelledError):
                await main()

    # ---- xreadgroup returns nothing → loop continues -----------------

    async def test_empty_read_continues_loop(
        self,
        mock_redis: AsyncMock,
        mock_smtp: MagicMock,
        mock_db_session: AsyncMock,
    ):
        mock_redis.xreadgroup.side_effect = [
            [],                          # first call: nothing
            [],                          # second call: nothing
            asyncio.CancelledError(),    # third call: break
        ]

        with (
            patch(f"{WORKER_MODULE}.get_redis", return_value=mock_redis),
            patch(f"{WORKER_MODULE}.ensure_group", new_callable=AsyncMock),
            patch(f"{WORKER_MODULE}.smtplib.SMTP", return_value=mock_smtp),
            patch(f"{WORKER_MODULE}.AsyncSessionLocal", return_value=mock_db_session),
        ):
            with pytest.raises(asyncio.CancelledError):
                await main()

        mock_smtp.send_message.assert_not_called()
        mock_db_session.commit.assert_not_called()

    # ---- conditions=None handled gracefully --------------------------

    async def test_null_conditions_field(
        self,
        mock_redis: AsyncMock,
        mock_smtp: MagicMock,
        mock_db_session: AsyncMock,
    ):
        job = _make_job(email_flag=False)
        job["conditions"] = None  # edge case from Polygon
        patches = self._patch_infrastructure(
            mock_redis, mock_smtp, mock_db_session, [job]
        )

        with (
            patches["redis"],
            patches["group"],
            patches["smtp"],
            patches["db"],
        ):
            with pytest.raises(asyncio.CancelledError):
                await main()

        added = mock_db_session.add.call_args[0][0]
        assert added.conditions == ""  # ",".join([]) == ""