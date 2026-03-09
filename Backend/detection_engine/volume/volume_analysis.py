from rollingvolumetracker import RollingVolumeTracker
from trade_impact_detector import TradeImpactDetector
from relative_volume_classifier import relativeVolumeClassifier
import math

class volumeAnalyzer:
    """
    The purpose of this class is to consolidate all the volume analysis done on bars into a single call. 
    This way whenever we add other volume metrics to the codebase, the logic can stay mostly the same with most modifications 
    being made in this file
    """

    def __init__(self, symbol : str ="", window_minutes : int = 5):
        self.symbol = symbol
        self.tracker = RollingVolumeTracker(window_minutes=window_minutes)
        self.impact_detector =TradeImpactDetector()
        self.classifier = relativeVolumeClassifier()

    def process_bar(self, bar : dict) -> dict:
        """
        process a single incoming bar through the analysis pipeline

        """

        self.tracker.update(bar)

        rolling_volume = self.tracker.current_volume()
        impact_ratio = self.impact_detector.compute_ratio(bar['v'], rolling_volume)
        classification = self.classifier.classify(impact_ratio)
        

        return {
            "symbol" : self.symbol,
            "bar" : bar,
            "rolling_volume" : rolling_volume,
            "trade_count" : self.tracker.current_trade_count(),
            "impact_ratio" : round(impact_ratio, 6),
            "impact_classification" : classification

        }

