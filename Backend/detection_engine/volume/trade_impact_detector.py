class TradeImpactDetector:
    """
    Calculates percentage of total rolling volume accounted for by a given trade
    In the future could add some functionality to test how good a predictor this is of price change
    """
    def compute_ratio(self, trade_size, rolling_volume):
        if rolling_volume == 0:
            return 0
        
        return trade_size/rolling_volume