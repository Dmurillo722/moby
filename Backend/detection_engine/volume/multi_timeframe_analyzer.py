from collections import deque
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field

class TimeframeConfig:

    """Class used to configure analysis timeframes and their corresponding volume thresholds
    
        window_minutes: the rolling window duration
        vol_threshold: a dict that maps signal types vor volume classifications ("Extreme", "High", "Moderate") 
        to their corresponding timeframe sizes ()
    """
    
    def __init__(self, window_minutes, vol_threshold=None, min_bars=3):
        self.window_minutes = window_minutes
        self.min_bars = min_bars

        if vol_threshold is not None:
            self.vol_threshold = vol_threshold
        else:
            #in a 5 minute window with 1 minute bars, a single bar accounts for total volume of 0.2, so we can set thresholds as percentages of that
            base = 5/self.window_minutes
            self.vol_threshold = {
                "Extreme" : round(0.25*base, 4),
                "High" : round(0.15*base, 4),
                "Moderate" : round(0.05*base, 4)     
            }


#Default timeframes presets based on common technical analysis timeframes and the number of bars needed to make a signal decision
#5 minute: good for OFI, detects initial bursts of directional pressure in a given direction
#15 minute: captures most of VWAP/TWAP signal patterns, gives intermediate view of institutional activity
#30 minute: full execution window for larger institutional orders 

Default_timeframes = [
    TimeframeConfig(window_minutes=5, min_bars=3),
    TimeframeConfig(window_minutes=15, min_bars=8),
    TimeframeConfig(window_minutes=30, min_bars=15)
    ]


class MultiTimeFrameAnalyzer:
    """Maintains a deque of bars per symbol which is sized to the largest timeframe used. Computes volume impact, OFI, 
    and classsification metrics over each configured sub-window from the same data. 
    
    This way we can avoid duplicating data storage and processing across multiple separate analyzers for each timeframe, 
    and instead compute all metrics in one pass through the data based on the time frame that is needed for the given operation
    """

    def __init__(self, symbol, timeframes=None):
        self.symbol = symbol
        self.timeframes = timeframes or Default_timeframes
        self.bars = deque()
        self.max_window = max([tf.window_minutes for tf in self.timeframes])
        self._bar_counts = {tf.window_minutes: 0 for tf in self.timeframes}
    
    def process_bar(self, bar):
        """ 
        Process a single incoming bar through all timeframe analyses

        bar: dict with keys: timestamp, open, high, low, close, volume

        retruns a dict with following structure:
        {
            "symbol": str,
            "bar": dict,
            "timeframes" : {
                5 : {"rolling_volume": float, "impact_ratio": str},
                15 : {"rolling_volume": float, "impact_ratio": str},
                30 : {"rolling_volume": float, "impact_ratio": str}
            },
            "convergence" : {...} #cross timeframe signal strength and convergence metrics

       }
        """

    print("hello world")
    

    def trim(self, current_time):
        """Trim bars that are outside the largest timeframe window"""
        #set the cutoff time for the largest window
        cutoff = current_time - timedelta(minutes=self.max_window)
        #remove bars from the left of the deque until we find one that is within the cutoff time
        while self.bars and self.bars[0]["t"] < cutoff:
            #evict the bar from the left of the deque 
            #and update the bar counts for each timeframe if the evicted bar was within their respective windows
            old_bar = self.bars.popleft()
            for tf in self.timeframes:
                if old_bar in tf.bars:
                    tf_cutoff = current_time - timedelta(minutes=tf.window_minutes)
                    if old_bar["t"] < tf_cutoff:
                        #if the evicted bar is outside the cutoff for the given timeframe, decrement the bar count 
                        #for that timeframe
                        self._bar_counts[tf.window_minutes] = max(0, self._bar_counts[tf.window_minutes] - 1)

    def get_window(self, current_time, window_minutes):
        """
        Return bars within the specified sub-window by iterating backward from the deque's right end
        Stop when we hit a bar outside the window
        """


        cutoff = current_time - timedelta(minutes=window_minutes)
        result = []
        for bar in reversed(self.bars):
            if bar["t"] >= cutoff:
            
    



