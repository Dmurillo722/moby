from collections import deque
from datetime import datetime, timedelta, timezone

class RollingVolumeTracker:

    """
    This class is just for keeping the total volume updated for a given time frame when doing some sort of volume analysis
    Instance gets initialized at start of the window

    Things you should know:
    window_minutes:  number of minutes in the desired analysis window
    bars: a deque containing bar data that will be routed from alpaca. each entry in the deque is a full bar json that has been converted into a python dict

    """


    def __init__(self, window_minutes=5):
        self.window_minutes = window_minutes
        self.bars=deque() #using a deque here instead of a traditional list is generally considered better practice for time series data
        self.total_volume = 0
        

    def update(self, bar):
        self.bars.append(bar)
        self.total_volume += bar["v"]
        #self._trim()
        pass



    def current_volume(self):
        return self.total_volume
    

    def trim_timeframe(self):
        """
        Trim off the data from time that has fallen out of the desired timeframe
        """
        #define a cutoff by subtracting desired timeframe from the current time
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=self.window_minutes)
        #while there is still data in the deque of bars and 
        while self.bars and self.bars[0]["t"] < cutoff:
            old = self.bars.popleft
            self.total_volume -= old["v"]




        
        
        

        
        