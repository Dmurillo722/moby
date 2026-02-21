
class relativeCorrelation_analyzer:


    """
    Purpose of this file is to measure  average relative 
    correlation of a given security with an ETF in it's sector
    """

    def compute(self, returns_df):
        corr_matrix = returns_df.corr()
        avg_corr = corr_matrix.mean()
        return avg_corr