import pandas as pd

class momentum_analyzer:
    """
    Calculates absolute momentum for a security on a given timeframe
    Momentum is a measure of a security's performance against its own past 
    that does so by calculating the total return over a given time frame

    """

    def compute(self, returns_df):
        return returns_df.rolling(84).sum().iloc[-1]