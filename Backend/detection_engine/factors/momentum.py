class momentum_analyzer:
    """
    Calculates absolute momentum for a security on a given timeframe
    Momentum is a measure of a security's performance against its own past 
    that does so by calculating the total return over a given time frame

    Absolute momentum is defined as the 4-month rate of change on daily returns
    ROC = (current close - close_N_days_ago)/close_N_days_ago *100

    Uses live data for individual stocks
    Uses Historical data for ETFs

    lookback days is set to 84 as this is trading days not total number of days in a month


    """
    #default value of lookback days of 84 (Little under 3 months)
    def __init__(self, lookback_days = 84):
        self.lookback_days = lookback_days

    def compute_momentum(self, bars : list[dict]) -> float | None:
        """
        Compute 4 month absolute momentum from list of bar dicts
        
        :param self: Description
        :param bars: FULL DAY BARS makes use of daily bars as this is part of a longer term strategy (can use alpaca api to get historical data)
        :type bars: list[dict]
        :return: Description
        :rtype: float | None
        """

        #insufficient time frame for data
        if len(bars) < self.lookback_days + 1:
            return None

        #get closing price of most recent bar
        current_close = bars[-1]["c"]
        #get the bar as far back as the earliest lookback day
        past_close = bars[-(self.lookback_days+1)]["c"]

        if past_close == 0:
            return None
        
        #calculate rate of change
        roc = (current_close - past_close)/past_close * 100

        return roc
    
    def compute_from_closes(self, closes : list[float])->float | None:
        """
        This method can be invoked when closing price data is already given without having to extract it from a dict or json
        
        :param self: Description
        :param closes: List of closing prices
        :type closes: list[float]
        :return: Description
        :rtype: float
        """


        if len(closes) < self.lookback_days +1:
            return None
        
        current_close = closes[-1]
        past_close = closes[-(self.lookback_days+1)]

        if past_close == 0:
            return None
        
        return (current_close-past_close) / past_close *100
    

    def is_positive(self, bars : list[dict]) ->bool |None:
        """
        Docstring for is_positive
        
        :param self: Description
        :param bars: Description
        :type bars: list[dict]
        :return: Description
        :rtype: bool | None
        """

        momentum = self.compute_momentum(bars)

        if momentum is None:
            return None
        
        return momentum > 0