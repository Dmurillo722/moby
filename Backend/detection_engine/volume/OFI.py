from collections import deque
from datetime import datetime, timedelta, timezone
class OFI_equities:
    """
    Order flow imbalance is the difference between buy and sell orders (typically within a short timeframe)
    A high positive OFI shows that the buying pressure is causing price to rise
    """

    def __init__(self, window_minutes=5):
        self.window_minutes= window_minutes
        self.trades=deque()
        self.trade_count = 0
        self.buy_count = 0
        self.sell_count = 0
    
    def update(self, trade):
        self.trim_timeframe()
        self.trades.append(trade)
        self.trade_count += 1
    
    def current_trade_count(self):
        return self.trade_count

    
    def trim_timeframe(self):
        """
        Trim off the data from time that has fallen out of the desired timeframe (form the left)
        """
        
        pass
        #define a cutoff by subtracting desired timeframe from the current time
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=self.window_minutes)
        #while there is still data in the deque of bars and 
        while self.trades and self.trades[0]["t"] < cutoff:
            #get rid of trades that fall out of scope for the timeframe
            old = self.trades.popleft()
            self.trade_count -= 1
            #subtract sell order from total count
            #if old[] == "SELL":
            #    self.sell_count -= 1
            #else:
            #    self.buy_count -=1
            
    
    #def calculate_OFI(self):
