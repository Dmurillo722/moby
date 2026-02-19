import asyncio
import json
import json
import websockets
from app.core.config import settings
import asyncio

class AlpacaConsumer():
    def __init__(self, logger, queue: asyncio.Queue, setting: bool, symbols_trades = ["AAPL"], symbols_quotes = [], symbols_bars = []):
        self.logger = logger
        self.queue = queue
        self.setting = setting # placeholder for some sort of configuration we might want to add to the consumer
        self.alpaca_stream_url = "wss://stream.data.alpaca.markets/v2/iex"
        self.symbols_trades = symbols_trades
        self.symbols_quotes = symbols_quotes
        self.symbols_bars = symbols_bars

    async def stream_market_data(self):
        self.logger.info("Connecting to Alpaca")
        try:
            async with websockets.connect(self.alpaca_stream_url) as ws:
                await ws.send(json.dumps({"action": "auth", "key": settings.ALPACA_API_KEY, "secret": settings.ALPACA_API_SECRET}))

                subscribe_message = {"action": "subscribe"}
                if self.symbols_trades:
                    subscribe_message["trades"] = self.symbols_trades
                if self.symbols_quotes:
                    subscribe_message["quotes"] = self.symbols_quotes
                if self.symbols_bars:
                    subscribe_message["bars"] = self.symbols_bars

                # subscribing to stream based on object values for trade symbols, quote symbols, bar symbols
                await ws.send(json.dumps(subscribe_message))
                self.logger.info(f"Subscribed: {subscribe_message}")
                self.logger.info("Receiving data from Alpaca")
                async for message in ws:
                    try:
                        self.queue.put_nowait(message)
                    except asyncio.QueueFull:
                        self.logger.warning("Bounded queue full, messages are being dropped")

        except Exception as e:
            self.logger.error(f"Problem connecting to alpaca websocket {e}")
            # alpaca reconnection logic