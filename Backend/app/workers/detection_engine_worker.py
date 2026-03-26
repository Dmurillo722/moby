#consume from moby:bars and maintain per-symbol in-memory state (the deques in the Rollingvolumetracker and the volumeAnalyzer) and publishes detected signals to a new stream moby:signals
from collections import deque
from datetime import datetime, timedelta, timezone
import json
import asyncio
import logging
from redis.exceptions import RedisError, ResponseError
from app.core.database import get_redis
from detection_engine.volume_analyzer import VolumeAnalyzer

"""
Pure analysis process meant to read bars, run analysis, and publish signals that meet some determined threshold. 
This worker won't interact with the database, instead just consuming bar data and telling the other workers when to send the alerts
"""

