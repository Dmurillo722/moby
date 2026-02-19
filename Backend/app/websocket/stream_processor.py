
import asyncio

class StreamProcessor():
    def __init__(self, logger, worker_count: int, queue: asyncio.Queue):
        self.logger = logger
        self.queue = queue
        self.workers_count = worker_count
        self.workers = []
    
    async def start(self):
        self.workers = [asyncio.create_task(self.alapaca_processor_worker(i)) for i in range(self.workers_count)]
        self.logger.info(f"Started stream workers")
    
    async def stop(self):
        for task in self.workers:
            task.cancel()
        await asyncio.gather(*self.workers, return_exceptions=True, cancel_on_error=True)
        self.logger.info("Processing stream workers stopped")

    async def alapaca_processor_worker(self, id):
        while True:
            msg = await self.queue.get()
            try:
                print(msg)
                # process(msg) # delegate to service logic, might want to implement batching here if it can't keep up
            finally:
                self.queue.task_done()