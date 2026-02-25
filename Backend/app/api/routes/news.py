from fastapi import APIRouter, HTTPException
from typing import Any
from datetime import date, timedelta
import os
import json
import urllib.request
import urllib.parse

router = APIRouter(prefix="/news", tags=["items"])


@router.get("/{asset_symbol}")
async def read_news(asset_symbol: str) -> Any:
    """
    Get Company News By Symbol
    """
    token = os.getenv("FINNHUB_API_KEY")
    if not token:
        raise HTTPException(status_code=500, detail="Finnhub API key not set")

    to_dt = date.today()
    from_dt = to_dt - timedelta(days=14)

    base_url = "https://finnhub.io/api/v1/company-news"

    params = {
        "symbol": asset_symbol.upper(),
        "from": from_dt.isoformat(),
        "to": to_dt.isoformat(),
        "token": token,
    }

    url = f"{base_url}?{urllib.parse.urlencode(params)}"

    try:
        with urllib.request.urlopen(url) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=response.status,
                    detail=response.read().decode()
                )

            data = response.read()
            return json.loads(data)

    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=e.reason)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market/{category}")
async def read_market_news(category: str = "general"):
    """
    Get Market News from Finnhub

    Categories:
    - general
    - forex
    - crypto
    - merger
    """
    token = os.getenv("FINNHUB_API_KEY")
    if not token:
        raise HTTPException(status_code=500, detail="Finnhub API key not set")

    base_url = "https://finnhub.io/api/v1/news"

    params = {
        "category": category.lower(),
        "token": token,
    }

    url = f"{base_url}?{urllib.parse.urlencode(params)}"

    try:
        with urllib.request.urlopen(url) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=response.status,
                    detail=response.read().decode()
                )

            data = response.read()
            return json.loads(data)

    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail=e.reason)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))