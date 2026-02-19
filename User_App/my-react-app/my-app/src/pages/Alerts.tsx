import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingUp, TrendingDown, Activity } from 'lucide-react';

function FinancialOverview({ symbol }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/alerts/user_alerts/${symbol}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setData)
      .catch(setError);
  }, [symbol]);

  return (
    <div>
      <h2>{data?.asset_symbol}</h2>
      <p>Revenue: {data?.revenue}</p>
      <p>Net Income: {data?.net_income}</p>
    </div>
  );
}

const VolumeActivityChart = ({ data }: { data: any[] }) => {
  const maxVolume = Math.max(...data.map(d => d.volume));
  const maxPrice = Math.max(...data.map(d => Math.max(d.high, d.open, d.close)));
  const minPrice = Math.min(...data.map(d => Math.min(d.low, d.open, d.close)));
  const priceRange = maxPrice - minPrice;
  
  const getY = (price: number) => {
    return 200 - ((price - minPrice) / priceRange) * 180;
  };

  return (
    <div className="w-full bg-muted/20 rounded-lg p-4">
      <svg width="100%" height="250" viewBox="0 0 600 250" preserveAspectRatio="none">
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={`grid-${i}`}
            x1="40"
            y1={10 + i * 48}
            x2="580"
            y2={10 + i * 48}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="1"
          />
        ))}

        {data.map((item, i) => {
          const x = 60 + i * 50;
          const isGreen = item.close >= item.open;
          const color = isGreen ? '#10b981' : '#ef4444';
          
          const highY = getY(item.high);
          const lowY = getY(item.low);
          const openY = getY(item.open);
          const closeY = getY(item.close);
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.abs(closeY - openY) || 1;

          return (
            <g key={i}>
              <line
                x1={x}
                y1={highY}
                x2={x}
                y2={lowY}
                stroke={color}
                strokeWidth="1.5"
              />
              <rect
                x={x - 8}
                y={bodyTop}
                width="16"
                height={bodyHeight}
                fill={color}
                opacity="0.8"
              />
              <rect
                x={x - 8}
                y={210}
                width="16"
                height={(item.volume / maxVolume) * 30}
                fill={color}
                opacity="0.3"
              />
            </g>
          );
        })}

        <text x="5" y="15" fill="#94a3b8" fontSize="10">${maxPrice.toFixed(0)}</text>
        <text x="5" y="205" fill="#94a3b8" fontSize="10">${minPrice.toFixed(0)}</text>
      </svg>
    </div>
  );
};

const SentimentMeter = ({ value }: { value: number }) => {
  const getColor = () => {
    if (value >= 60) return '#10b981';
    if (value >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Negative</span>
        <span className="text-muted-foreground">Neutral</span>
        <span className="text-muted-foreground">Positive</span>
      </div>
      <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500 rounded-full"
          style={{
            width: `${value}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>
      <div className="text-center">
        <span className="text-2xl font-bold font-mono" style={{ color: getColor() }}>
          {value}%
        </span>
      </div>
    </div>
  );
};

const SentimentTimeline = () => {
  const timelineData = [
    { time: '9:00', sentiment: 45 },
    { time: '10:00', sentiment: 52 },
    { time: '11:00', sentiment: 48 },
    { time: '12:00', sentiment: 55 },
    { time: '1:00', sentiment: 62 },
    { time: '2:00', sentiment: 58 },
  ];

  const maxSentiment = 100;

  return (
    <div className="w-full bg-muted/20 rounded-lg p-4">
      <svg width="100%" height="150" viewBox="0 0 500 150" preserveAspectRatio="xMidYMid meet">
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1="40"
            y1={20 + i * 25}
            x2="480"
            y2={20 + i * 25}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="1"
          />
        ))}

        <path
          d={timelineData
            .map((d, i) => {
              const x = 60 + i * 70;
              const y = 120 - (d.sentiment / maxSentiment) * 100;
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ')}
          stroke="#06b6d4"
          strokeWidth="2.5"
          fill="none"
        />

        {timelineData.map((d, i) => {
          const x = 60 + i * 70;
          const y = 120 - (d.sentiment / maxSentiment) * 100;
          const color = d.sentiment >= 50 ? '#10b981' : '#ef4444';
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill={color} />
              <text x={x} y="140" fill="#94a3b8" fontSize="10" textAnchor="middle">
                {d.time}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const Alerts = () => {
  const [alerts] = useState([
    {
      id: 1,
      time: '10:23 AM',
      symbol: 'AAPL',
      type: 'Price',
      confidence: 'High',
      change: '+2.3%',
      reason: 'Price crossed above resistance level of $175.50 with increased volume',
    },
    {
      id: 2,
      time: '09:45 AM',
      symbol: 'TSLA',
      type: 'Volume',
      confidence: 'Medium',
      change: '+15.2%',
      reason: 'Trading volume 150% above 30-day average, indicating strong buying interest',
    },
    {
      id: 3,
      time: '09:12 AM',
      symbol: 'MSFT',
      type: 'Price',
      confidence: 'High',
      change: '-1.1%',
      reason: 'Price dropped below support level with selling pressure',
    },
    {
      id: 4,
      time: '08:30 AM',
      symbol: 'GOOGL',
      type: 'Sentiment',
      confidence: 'Medium',
      change: '+0.8%',
      reason: 'Positive sentiment surge detected across social media platforms',
    },
  ]);

  const [selectedAlert, setSelectedAlert] = useState(alerts[0]);

  const volumeData = [
    { open: 175, high: 178, low: 174, close: 177, volume: 45 },
    { open: 177, high: 179, low: 176, close: 176, volume: 52 },
    { open: 176, high: 180, low: 175, close: 179, volume: 68 },
    { open: 179, high: 182, low: 178, close: 180, volume: 75 },
    { open: 180, high: 181, low: 177, close: 178, volume: 62 },
    { open: 178, high: 183, low: 177, close: 182, volume: 88 },
    { open: 182, high: 185, low: 181, close: 183, volume: 95 },
    { open: 183, high: 184, low: 180, close: 181, volume: 70 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Alerts</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="text-muted-foreground font-semibold">Time</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Symbol</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Type</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Confidence</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow
                      key={alert.id}
                      className={`hover:bg-accent/50 transition-colors border-border cursor-pointer ${
                        selectedAlert?.id === alert.id ? 'bg-accent/30' : ''
                      }`}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {alert.time}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">{alert.symbol}</span>
                        <span
                          className={`ml-2 text-xs ${
                            alert.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'
                          }`}
                        >
                          {alert.change}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted/50 border-border">
                          {alert.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            alert.confidence === 'High'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }
                        >
                          {alert.confidence}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {selectedAlert && (
            <>
              <Card className="border-border">
                <CardHeader className="border-b border-border bg-card">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Alert Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Symbol:</span>
                      <div className="mt-1 text-lg font-semibold text-foreground">
                        {selectedAlert.symbol}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Time:</span>
                      <div className="mt-1 text-lg font-semibold text-foreground">
                        {selectedAlert.time}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Confidence:</span>
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className={
                            selectedAlert.confidence === 'High'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }
                        >
                          {selectedAlert.confidence}
                        </Badge>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-sm text-muted-foreground">Reason:</span>
                      <div className="mt-1 text-sm text-foreground leading-relaxed">
                        {selectedAlert.reason}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="border-b border-border bg-card">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Volume Activity
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <VolumeActivityChart data={volumeData} />
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="border-b border-border bg-card">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Sentiment Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      Overall Sentiment:
                    </h3>
                    <SentimentMeter value={65} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      Mention Activity:
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground font-mono">2,847</span>
                      <span className="text-sm text-emerald-500 font-semibold flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        +24% vs avg
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      mentions in the last 24 hours across tracked platforms
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      Sentiment Over Time:
                    </h3>
                    <SentimentTimeline />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;