import asyncio
import json
import json
from redis.asyncio import Redis
import websockets
from app.core.config import settings
import asyncio

class AlpacaConsumer():
    def __init__(self, logger, redis: Redis, setting: bool, symbols_trades = ["AAPL"], symbols_quotes = [], symbols_bars = []):
        self.logger = logger
        self.redis = redis
        self.setting = setting # placeholder for some sort of configuration we might want to add to the consumer
        self.alpaca_stream_url = "wss://stream.data.alpaca.markets/v2/iex"
        self.symbols_trades = symbols_trades
        self.symbols_quotes = symbols_quotes
        self.symbols_bars = symbols_bars
        self._stop_event = asyncio.Event()
        self.logger.info("Created alpaca consumer")

    async def stream_market_data(self):
        self.logger.info("Streaming market data")
        try:
            async with websockets.connect(self.alpaca_stream_url) as ws:
                self.logger.info("Here")
                await ws.send(json.dumps({
                    "action": "auth",
                    "key": settings.ALPACA_API_KEY,
                    "secret": settings.ALPACA_API_SECRET
                }))
                self.logger.info("Alpaca connection opened")

                subscribe_message = {"action": "subscribe"}
                if self.symbols_trades:
                    subscribe_message["trades"] = self.symbols_trades
                if self.symbols_quotes:
                    subscribe_message["quotes"] = self.symbols_quotes
                if self.symbols_bars:
                    subscribe_message["bars"] = self.symbols_bars
                subscribe_message['extended_hours'] = True

                # subscribing to stream based on object values for trade symbols, quote symbols, bar symbols
                await ws.send(json.dumps(subscribe_message))
                self.logger.info(f"Subscribed: {subscribe_message}")

                async for message in ws:
                    if self._stop_event.is_set():
                        self.logger.info("Stopping Alpaca consumer")
                        break
                    data = json.loads(message)
                    self.logger.info(f"Alpaca data received, sending to redis stream")
                    # adding message to in-memory redis stream
                    await self.redis.xadd("alpaca:stream", {"data": json.dumps(data)})
        except Exception as e:
            self.logger.error(f"Problem connecting to alpaca {e}")

    # callable shutdown function that allows for not cutting off in the middle of reading a message
    def stop(self):
        self._stop_event.set()