#placeholder
""" 
Bar-based order flow imbalance. Uses close vs open to represent net trade direction within each bar (weighted by volume)

"""

from detection_engine.volume.methods.base_method import BaseAnalysisMethod

class OFIBarsMethod(BaseAnalysisMethod):
    name = "ofi"

    relevant_windows = [5, 15]

    required_fields = {"o", "c", "v"}

    min_bars = 3

    def compute(self, current_bar, window_bars):
        """
        Alpaca does not tell us if transactions are buyer or seller initiated
        """
        net_ofi = 0.0
        buy_volume = 0
        sell_volume = 0

        for bar in window_bars:
            #if the close price is higher than the open we have positive buying pressure
            if bar["c"] > bar["o"]:
                net_ofi += bar["v"]
                buy_volume += bar["v"]
            else: #otherwise we have negative buying pressure (positive selling pressure)
                net_ofi -= bar["v"]
                sell_volume += bar["v"]
        
        total =  buy_volume + sell_volume

        normalized_ofi = net_ofi/total if total > 0 else 0.0

        buy_ratio = buy_volume /total if total > 0 else 0.5

        return {
            "net_ofi" : round(net_ofi, 3),
            "normalized_ofi" : round(normalized_ofi, 3),
            "buy_volume" : buy_volume,
            "sell_volume" : sell_volume,
            "buy_ratio" : round(buy_ratio, 3)
        }