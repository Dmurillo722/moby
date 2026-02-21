
class relativeCorrelation_analyzer:

    def compute(self, returns_df):
        corr_matrix = returns_df.corr()
        avg_corr = corr_matrix.mean()
        return avg_corr