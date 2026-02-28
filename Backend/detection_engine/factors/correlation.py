import math

class relativeCorrelationAnalyzer:
    """
    Computes 4-month average relative correlation for a set of ETFs as specified in the paper detailing RAAM

    Correlation is computed across all ETF pairs on daily returns
    Lookback window is 4 months
    Each asset's score is its average pairwise correlation with all other assets
    Lower average correlation means better diversification and yields a higher rank

    For individual stocks, the correlation score for an ETF the given stock is mapped to (determined by a mapping function that will also be implemented)
    So this class will only operate on the 11 ETFs directly

    Input data:
    A dict mapping ETF ticker -> list of close prices that is ordered oldest->newest
    This does not need a websocket as we only need the close prices after a given day which can be done with yfinance or an alpaca api call

    """

    def __init__(self, lookback_days=84):
        self.lookback_days = lookback_days

    def compute_returns(self, closes: list[float]) ->list[float]:
        """ 
        Compute daily log returns from a list of close prices
        """
        returns = []
        for i in range(1, len(closes)):
            if closes[i-1] > 0 and closes[i] > 0:
                #use of log returns here as they are better for representing returns over a time series
                returns.append(math.log(closes[i]/closes[i-1]))
        return returns
    
    def pearson_correlation(self, x:list[float], y:list[float]) ->float | None:
        """ 
        Compute pearson correlation coefficient between two return series
        Returns none if either series has zero variance
        """

        n = min(len(x), len(y))
        
        #too few data points
        if n < 2:
            return None
        
        #normalize time frames
        x = x[:n]
        y = y[:n]
        
        mean_x = sum(x)/n
        mean_y = sum(y)/n

        cov = sum((x[i] - mean_x)*(y[i] - mean_y) for i in range(n))
        
        #no need to divide by sample size here as it cancels later when working with pearson 
        std_x = math.sqrt(sum((xi - mean_x)**2 for xi in x))
        std_y = math.sqrt(sum((yi - mean_y)**2 for yi in y))


        if std_x == 0 or std_y == 0:
            return None
        
        return cov/(std_y*std_x)
    

    def compute(self, etf_closes: dict[str, list[float]])->dict[str, float] | None:
        """ 
        Compute the average relative correlation for each etf over the lookback window
        
        etf_closes: dict mapping ticker to its respective list of close prices oldest->newest, lists should have size of lookbackdays + 1

        returns: a dict mapping ticker-> average correlation score or None if there is insufficient data
        """
        tickers = list(etf_closes.keys())

        for ticker in tickers:
            if len(etf_closes[ticker]) < self.lookback_days + 1:
                return None
            
        #compute returns over lookback window for each etf
        returns: dict[str, list[float]] = {}
        for ticker in tickers:
            recent_closes = etf_closes[ticker][-(self.lookback_days+1):]
            returns[ticker] = self.compute_returns(recent_closes)

        #compute avg pairwise correlations for each ETF

        avg_correlations: dict[str, float] = {}
        for ticker in tickers:
            correlations =[]
            for other_ticker in tickers:
                #skip when we come to the same ticker we are already working with
                if other_ticker == ticker:
                    continue

                corr = self.pearson_correlation(returns[ticker], returns[other_ticker])
                if corr is not None:
                    correlations.append(corr)
                
                if not correlations: 
                    avg_correlations[ticker] = 0.0
                else:
                    avg_correlations[ticker] = sum(correlations)/len(correlations)
                
        return avg_correlations
    
    def compute_single(self, target_closes:list[float], etf_closes: dict[str, list[float]])->float | None:
        """ 
        Compute the average correlation of a single security againsta set of ETFs
        This is what we will be using to adapt the RAAM model seen in the paper to all stocks as only ETFs were used in that paper.
        We will need to perform some backtesting on the efficacy of this method

        target_closes: close prices for the target security (oldest->newest)
        etf_closes: dict mapping etf_ticker ->list of close prices

        returns: avg correlation of the target against all ETFs, retruns None if there is insufficient data
        """

        if len(target_closes) < self.lookback_days+1:
            return None
        
        target_returns = self.compute_returns(target_closes[-(self.lookback_days+1):])

        correlations = []
        for ticker, closes in etf_closes.items():
            if len(closes) < self.lookback_days-1:
                continue

            etf_returns = self.compute_returns(closes[-(self.lookback_days+1):])
            corr = self.pearson_correlation(target_returns, etf_returns)
            if corr is not None:
                correlations.append(corr)

            if not correlations:
                return None
            
        return sum(correlations)/len(correlations)