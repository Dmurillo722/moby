import asyncio
from app.schemas.schemas import AlpacaTrade
from app.services.basic_alert_gen import trade_size_comparison
from app.core.database import AsyncSessionLocal

class StreamProcessor():
    def __init__(self, logger, worker_count: int, queue: asyncio.Queue):
        self.logger = logger
        self.queue = queue
        self.worker_count = worker_count
        self.workers = []

    async def start(self):
        self.workers = [asyncio.create_task(self.alapaca_processor_worker(i)) for i in range(self.worker_count)]
        self.logger.info(f"Started stream workers")
    
    async def stop(self):
        for task in self.workers:
            task.cancel()
        await asyncio.gather(*self.workers, return_exceptions=True, cancel_on_error=True)
        self.logger.info("Processing stream workers stopped")

    async def alapaca_processor_worker(self, id):
        while True:
            events = await self.queue.get()
            try: # messages contain an array of multiple trades
                for event in events:
                    self.logger.info(f"Trade received {event}")
                    if event.get("T") == "t": # if the event is a trade, delegate to simple detection logic
                        trade = AlpacaTrade(**event) # usnpack trade into pydantic schema
                        try:
                            pass
                            async with AsyncSessionLocal() as db:
                                await trade_size_comparison(trade, db, logger=self.logger)
                        except Exception as e:
                            self.logger.exception('Problem processing trade')
                    pass
            finally:
                self.queue.task_done()