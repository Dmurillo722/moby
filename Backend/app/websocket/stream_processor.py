
from redis.asyncio import Redis
import redis
import json

class StreamProcessor():
    def __init__(self, logger, redis:Redis, stream_data):
        self.logger = logger
        self.redis = redis
        self.host = stream_data["redis_host"]
        self.port = stream_data["redis_port"]
        self.key = stream_data["stream_key"]
        self.group_name = stream_data["group_name"]
        self.consumer_name = stream_data["consumer_name"]

    async def process_market_stream(self):
        try:
            await redis.xgroup_create(self.key, self.group_name, id="$", mkstream=True)
        except:
            pass
    
        self.logger.info("Redis consumer for stream processor started")
        
        while True:
            resp = await self.redis.xreadgroup(
                groupname = self.group_name,
                consumername = self.consumer_name,
                streams={self.key: ">"},
                count=10,
                block=5000
            )

            if not resp:
                continue
                
            self.logger.info("Alpaca data read from redis stream by stream processor")
            for stream_name, messages in resp:
                for message_id, message_data in messages:
                    data_json = message_data.get("data")
                    if data_json:
                        data = json.loads(data_json)
                        self.logger.info(f"Redis stream [{message_id}] : {data}")
                    # acknowledge
                    await redis.xack(self.key, self.group_name, message_id)