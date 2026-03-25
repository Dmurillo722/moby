"""
Measures what fraction of rolling volume a single bar accounts accounts for and detects statistical outliers using z-scores. 
This metric is useful at all timeframes as a bar that is significant relative to both short and long windows is a good signal
"""

from detection_engine.volume.methods.base_method import BaseAnalysisMethod

class VolumeImpactMethod(BaseAnalysisMethod):
    name = "volume_impact"

    #empty list as all timeframes are relevant
    relevant_windows = []
    #only need volume for this one
    required_fields = {"v"}

    min_bars = 3

    def __init__(self, thresholds=None):
        """ 
        Thresholds: dict mapping timeframe (int minutes) to a dict of classification cutoffs. 
        If there is no thresholds parameter provided then the thresholds will be auto-scaled based on window size

        Example:
            thresholds = {
                5:  {"Extreme": 0.25, "Significant": 0.15, "Minor": 0.10},
                15: {"Extreme": 0.08, "Significant": 0.05, "Minor": 0.03},
                30: {"Extreme": 0.04, "Significant": 0.025, "Minor": 0.017},
            }


        """

        self.custom_thresholds = thresholds or []

    def compute(self, current_bar, window_bars):
            
        bar_volume = current_bar["v"]
        #compute rolling volume for all bars currently in the window
        rolling_volume = sum(b["v"] for b in window_bars)

        impact_ratio = bar_volume/rolling_volume if rolling_volume > 0 else 0.0

        #calculate z score for outlier detection\

        #get list of volumes in the current window
        volumes =  [b["v"] for b in window_bars]
        n = len(volumes)

        avg_vol = sum(volumes)/n if n>0 else 0

        vol_std = sum((v-avg_vol)**2 for v in volumes)/n if n>1 else 0.0

        z_score = (bar_volume-avg_vol)/vol_std if vol_std > 0 else 0.0
        return {
                "rolling_volume" : rolling_volume,
                "impact_ratio" : round(impact_ratio,3),
                "avg_bar_volume" : round(avg_vol,3),
                "volume_z_score" : round(z_score, 3)

            }
    
        
    def classify(self, impact_ratio, window_minutes):
        """Classify impact using per-timeframe thresholds called by the orchestrator after compute to add easily identifiable classifications to the results"""

        pass

    
    def _get_thresholds(self, window_minutes):
        
        if window_minutes in self.custom_thresholds:
            return self.custom_thresholds

        
        #assume uniform volume distribution with 
        base = 5/window_minutes

        return {
            "Extreme" : round(0.25 * base, 3),
            "Significant": round(0.15 * base, 3),
            "Minor": round(0.10 * base, 3)
        }

