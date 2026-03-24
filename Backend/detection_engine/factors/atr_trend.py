#placeholder
import math
from arch import arch_model

#uses a breakout techniwue based on price and volatility

#model varies in the session following the one in which the signal occurred
#if a given day's high is higher than the upper band, then the model will go Long (=2)
#if a given day's low is lower than the lower band, then the model will go Neutral/Short (=-2)

#in the ATR trend/breakout system, the Lowe Band (consisting of market sessions highs) is summed up and not subtracted from volatility, 
#defined by a 42 periods Average True Range (ATR) 
#this tells us that the greater the market volatility, the more responsive the model is to signals

