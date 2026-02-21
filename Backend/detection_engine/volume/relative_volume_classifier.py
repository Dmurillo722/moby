class relativeVolumeClassifier:
    """
    For now will use hardcoded values to determine significance of a volume event, in the future though this could be changed to reflect larger liquidity data of a
    given security
    """

    def classify(self, ratio):
        if ratio >= 0.25:
            return "Extreme"
        elif ratio >= 0.15:
            return "Significant"
        elif ratio >= 0.10:
            return "Minor"
        else: 
            return "Normal"