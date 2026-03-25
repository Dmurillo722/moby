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
        
        #
