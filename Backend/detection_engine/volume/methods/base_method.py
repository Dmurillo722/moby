"""
Base class that all volume analysis methods will inherit from. Defines the 
"""

class BaseAnalysisMethod:
    """
    Every analysis method must implement its own:

    name: identifier used as a key in results
    
    relevant windows: which timeframe windows the method should be using (if empty runs on all configured timeframes by default)
    
    required fields: bar dict of keys needed by the implemented method 

    min_bars: minimum number of bars needed before the given method produces meaningful output

    compute: the actual analysis logic for a given method
    """

    name : str = "base"

    #timeframes the method is relevant for (in minutes)
    #empty list means run on all configured timeframes, [5,15] means run on 5 and 15 minute windows

    relevant_windows : list[int] = []

    #bar dict keys the method requires
    #these are just the keys from Alpaca's bars (time, open, high, low, close, volume)
    required_fields : set[str] = {"t", "o", "h", "l",  "c", "v"}

    #min bars before output is valid    
    min_bars : int = 2

    def compute(self, current_bar : dict, window_bars : list[dict]) ->dict:
        """
        Run analysis on bars in given window
        
        current_bar : bar that just arrived
        window_bars : all bars within the relevant time window

        returns a dict with {metric_name : value}

        """
        #base class does not compute anything
        raise NotImplementedError
    
    def is_relevant_for(self, window_minutes: int) ->bool:
        """ Check if this method should run for a given timeframe"""

        #if the list is empty return true
        if not self.relevant_windows:
            return True
        
        #if the timeframe is in the relevant windows return true
        if window_minutes in self.relevant_windows:
            return True
        
        #otherwise return false
        return False
        




