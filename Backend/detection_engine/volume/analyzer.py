""" 
Top level class that manages windowed data an feeds it to the appropriate analysis method.
The detection engine worker will interact directly with this class. 

To add a new analysis method in the future:
1.Create a class that inherits from BaseAnalysisMethod
2. Implement name, relevant_windows, required_fields, and compute() functions
3. Pass an instance to teh SymbolAnalyzer class via the methods list or add it to the default list in create_default_analyzer

This class handles:
- bar storage and time based eviction
- Sub window extraction for each time frame
- Per-method warmup tracking
- Field validation at registration time
- Convergence assessment accross timeframes
"""

from collections import deque
from datetime import timedelta

from detection_engine.volume.methods.base_method import BaseAnalysisMethod
from detection_engine.volume.methods.volume_impact import VolumeImpactMethod
from detection_engine.volume.methods.ofi_bars import OFIBarsMethod

class SymbolAnalyzer:

    def __init__(self, symbol, window_minutes_list = None, methods=None, available_fields=None):
        self.symbol = symbol
        self.windows = window_minutes_list or [5,15,30]
        self.methods = methods or []
        self.bars = deque()
        self.max_window = max(self.windows)

    #check that every method has it's required fields available
    
        if available_fields is not None:
            #missing field is difference between required fields and those available
            for method in self.methods:
                missing = method.required_fields - available_fields

                if missing:
                    raise ValueError(
                        f"{method.name} requires  fields {missing} which are not available in the list of given available fields: {available_fields}"
                    )
        
        #counter for tracking if sufficient bars have been taken in to yield significant analysis by the given metric

        self._warmup_counts = {
            m.name : {w : 0 for w in self.windows if m.is_relevant_for(w)} for m in self.methods
        }
    
    def register_method(self, method, available_fields = None):
        """
        Add an analysis method after initialization
        """
        #if available fields are specified
        if available_fields is not None:
            #get the potentially missing fields
            missing = method.required_fields - available_fields
            #if any fields are missing then raise an error
            if missing:
                raise ValueError(
                    f"Method {method} requires the fields {missing} but they were not provided"
                )
        
        self.methods.append(method)
        self._warmup_counts[method.name] = {
            w : 0 for w in self.windows if method.is_relevant_for(w)
        }
    
    def trim(self, current_time):
        #cutoff is the difference between  current time and max window size in minutes
        cutoff = current_time - timedelta(minutes=self.max_window)

    
        #ensure that self.bars is populated and there is some bar with a timestamp earlier than the cutoff
        while self.bars and self.bars[0]["t"] < cutoff:
            
            #evict bar that fell out of frame
            old = self.bars.popleft()
            #for each method being used
            for method in self.methods:
                #for each window contained in the analyzer object
                for w in self.windows:
                    #check that the window is relevant for the method
                    if not method.is_relevant_for(w):
                        continue #if it isn't we can skip ahead
                    
                    #otherwise we have a relevant timeframe and we need to update the warmup counts of active methods
                    tf_cutoff = current_time - timedelta(minutes=w)
                    #decrement warmup count of active method
                    if old["t"] < tf_cutoff:
                        self._warmup_counts[method.name][w] = max(0, self._warmup_counts[method.name][w]-1)

    
    def _get_window(self, current_time, window_minutes):
        """ 
        Extract bars within a specific sub-window from the deque
        
        Returns a list of bar dicts within the window
        
        """

        cutoff = current_time - timedelta(window_minutes)
        
        result = []
        for bar in reversed(self.bars):
            if bar["t"] < cutoff:
                break

            result.append(bar)

        result.reverse()
        return result


    def _compute_convergence(self, timeframe_results):
        """ 
        Checks signal strength by looking at agreement across timeframes. This will help us make a more informed decision on whether 
        some data is just noise or if it is indicative of some larger pattern

        This function looks for the names of defined methods like ofi or trade impact detection and has unique logic for each of them, so whenever
        adding a new analysis method to the system, this function also must be updated
        
        """


        vol_classifications = []
        ofi_values = []

        #for each window and corresponding result data in the dictionary of timeframe results
        for w, tf_data in timeframe_results.items():
            methods = tf_data["methods"]
        
            #get data for checking convergence of VOLUME IMPACT
            vol_imp = methods.get("volume_impact", {})
            #if the method has had enough bars passed through and the impact classification has been calculated and is present
            if vol_imp.get("warmed_up") and "impact_classification" in vol_imp:
                vol_classifications.append(vol_imp["impact_classification"])
            

            #get data for checking convergence for BAR BASED OFI
            ofi = methods.get("ofi", {})
            if ofi.get("warmed_up") and "normalized_ofi" in ofi:
                ofi_values.append(ofi["normalized_ofi"])

            
        #check agreement of valid timeframes for which volume impact has been calculated
        notable = {"Extreme", "Significant"}
        
        volume_agreement : bool
        
        if len(vol_classifications) >= 2 and all(clas in notable for clas in vol_classifications):
            volume_agreement = True
        else:
            volume_agreement = False

        ofi_signs = []
        
        for v in ofi_values:
            if v>0.1:
                ofi_signs.append(1)
            elif v < -0.1:
                ofi_signs.append(-1)
            else:
                ofi_signs.append(0)


        nonzero = [s for s in ofi_signs if s != 0]

        ofi_agreement : bool
        if len(nonzero) >= 2 and all(sign == nonzero[0] for sign in nonzero):
            ofi_agreement = True
        else:
            ofi_agreement = False

        
        #combine results from metrics to determine overall signal strength
        if volume_agreement and ofi_agreement:
            strength = "strong"
        elif volume_agreement or (
            ofi_agreement and any(c in notable for c in vol_classifications)):
            strength = "moderate"
        elif any(c in notable for c in vol_classifications):
            strength = "weak"
        else:
            strength = "none"

    
        ofi_direction = None
        if ofi_agreement and nonzero:
            ofi_direction = "buy" if nonzero[0] > 0 else "sell"
        
        return {
            "signal_strength" : strength,
            "volume_agreement" : volume_agreement,
            "ofi_agreement" : ofi_agreement,
            "ofi_direction" : ofi_direction
        }
        
    
    def is_empty(self):
        """ Returns true if no bars have been ingested yet or if all bars have been evicted"""

        return len(self.bars) == 0
    
    def warmup_complete_all(self):
        """ Returns true only when all registered methods have warmed up to the point that there are sufficient bars for all 
        relevant timeframes within them to produce useful output"""

        return all(
            count >= method.min_bars for method in self.methods for w, count in self._warmup_counts[method.name].items()
            )
        
        
        
        


        
    
    def process_bar(self, bar):
        """
        Process a single incoming bar through all registered analysis methods at their relevant timeframes

        Handles adding and evicting entries from deques, making sure methods are properly warmed up, extracting subwindows where necessary


        Result will be a dict with the following structure:
        {
                "symbol": str,
                "bar": dict (the input bar),
                "timeframes": {
                    5: {
                        "window_minutes": 5,
                        "methods": {
                            "volume_impact": { metrics... },
                            "ofi": { metrics... },
                        }
                    },
                    15: { ... },
                },
                "convergence": {
                    "signal_strength": "strong"|"moderate"|"weak"|"none",
                    ...
                }
        }

        """
        bar_time = bar["t"]
        self.trim(bar_time)
        self.bars.append(bar)

        #update warmup counters
        for method in self.methods:

            for w in self.windows:
                if method.is_relevant_for(w):
                    #update the warmup count for that window
                    self._warmup_counts[method.name][w] = min(self._warmup_counts[method.name][w] + 1, method.min_bars+1)
                
        
        #run each method on relevant timeframes if enough warmup bars have been processed

        timeframe_results = {}

        for w in self.windows:
            window_bars = self._get_window(bar_time, w)
            timeframe_result = {"window_minutes" : w,  "methods" : {}} #will be passed to the final schema's "timeframe" key
        
            for method in self.methods:
                if not method.is_relevant_for(w):
                    continue
                
                #check that number of bars exceeds the number needed for warmup
                warmed = self._warmup_counts[method.name][w] >= method.min_bars

                if not warmed:
                    timeframe_result["methods"][method.name] ={
                        "warmed_up" : False,
                        "signals_suppressed" : True
                    }
                    continue

                #all analysis methods should have a compute method, this just tells us to carry out that calculation
                metrics = method.compute(bar, window_bars)

                #if the method has a "classify" function and "impact ratio" is one of the keys in metrics (i.e. we are dealing witht the volume impact function)
                if hasattr(method, "classify") and "impact_ratio" in metrics:
                    #calculate the trade's relative impact
                    metrics["impact_classification"] = method.classify(metrics["impact_ratio"], w)

                metrics["warmed_up"] = True
                metrics["signals_suppressed"] = False
                
            timeframe_results[w] = timeframe_result

        convergence = self._compute_convergence(timeframe_results)

        return {
            "symbol" : self.symbol,
            "bar" : bar,
            "timeframes" : timeframe_results,
            "convergence" : convergence
        }


def default_analyzer(symbol, window_minutes_list=None, available_fields=None):
    """ 
    Makes use of standard set of analysis methods. This will be called by the detection engine worker. 

    When new analysis methods are added in the future they must be added here
    """
    windows = window_minutes_list or [5,15,30]

    methods = [
        VolumeImpactMethod(),
        OFIBarsMethod()
        #any other implemented methods can go here in the future
    ]

    return SymbolAnalyzer(symbol=symbol, window_minutes_list=windows, methods=methods, available_fields=available_fields)