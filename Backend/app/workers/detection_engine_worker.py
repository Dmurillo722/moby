#consume from moby:bars and maintain per-symbol in-memory state (the deques in the Rollingvolumetracker and the volumeAnalyzer) and publishes detected signals to a new stream moby:signals
from collections import deque
from datetime import datetime, timedelta, timezone
import json
import asyncio
import logging
from redis.exceptions import RedisError, ResponseError
from app.core.database import get_redis
from detection_engine.volume_analyzer import VolumeAnalyzer

#the worker maintains a dict[str, volumeAnalyzer] where:
#the key is the symbol and the value is a volumeAnalyzer object that maintains a deque of bars for that symbol and performs the 
#necessary calculations to determine if a signal should be generated

#when a bar arrices,  look up or create the analyzer for that symbol, call process_bar(), and evaluate the result
#all deque based windowing stays in process memory, with a max of 30 symbols, with windows no larger than 5-10 minutes, this should be very manageable in memory and fast to process

