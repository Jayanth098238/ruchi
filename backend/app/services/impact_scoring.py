def compute_impact(sentiment: str) -> float:
    if sentiment == "POSITIVE":
        return 0.8
    elif sentiment == "NEGATIVE":
        return 0.2
    return 0.5
