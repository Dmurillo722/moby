import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

const Dashboard = () => {
  // Mock data for recent alerts
  const recentAlerts = [
    { id: 1, time: '10:23 AM', symbol: 'AAPL', type: 'Price', confidence: 'High', change: '+2.3%' },
    { id: 2, time: '09:45 AM', symbol: 'TSLA', type: 'Volume', confidence: 'Medium', change: '+15.2%' },
    { id: 3, time: '09:12 AM', symbol: 'MSFT', type: 'Price', confidence: 'High', change: '-1.1%' },
  ];

  // Mock data for watched symbols
  const watchedSymbols = [
    { symbol: 'AAPL', lastPrice: 178.23, volume: '52.3M', change: 2.3, changePercent: 1.31 },
    { symbol: 'TSLA', lastPrice: 242.84, volume: '98.7M', change: -3.21, changePercent: -1.30 },
    { symbol: 'MSFT', lastPrice: 412.56, volume: '28.1M', change: 5.67, changePercent: 1.39 },
    { symbol: 'GOOGL', lastPrice: 142.33, volume: '31.4M', change: 1.23, changePercent: 0.87 },
  ];

  // Mock news data
  const dailyNews = [
    { 
      title: 'Fed Signals Potential Rate Cuts in 2026', 
      source: 'Reuters',
      time: '2h ago',
      url: '#'
    },
    { 
      title: 'Tech Stocks Rally on AI Earnings Beat', 
      source: 'Bloomberg',
      time: '4h ago',
      url: '#'
    },
    { 
      title: 'Oil Prices Surge Amid Supply Concerns', 
      source: 'CNBC',
      time: '5h ago',
      url: '#'
    },
    { 
      title: 'European Markets Close Mixed', 
      source: 'Financial Times',
      time: '6h ago',
      url: '#'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Alert */}
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card">
              <CardTitle className="text-lg font-semibold text-foreground">Recent Alert</CardTitle>
            </CardHeader>
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
                  {recentAlerts.map((alert) => (
                    <TableRow key={alert.id} className="hover:bg-accent/50 transition-colors border-border">
                      <TableCell className="font-medium text-muted-foreground">{alert.time}</TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">{alert.symbol}</span>
                        <span className={`ml-2 text-xs ${
                          alert.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'
                        }`}>
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
                        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Watched Symbols Activity */}
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card">
              <CardTitle className="text-lg font-semibold text-foreground">Watched Symbols Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="text-muted-foreground font-semibold">Symbol</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Last Price</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Volume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchedSymbols.map((stock) => (
                    <TableRow key={stock.symbol} className="hover:bg-accent/50 transition-colors border-border">
                      <TableCell className="font-semibold text-foreground">{stock.symbol}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground font-mono">${stock.lastPrice.toFixed(2)}</span>
                          <div className={`flex items-center gap-1 text-xs font-medium ${
                            stock.change > 0 ? 'text-emerald-500' : 'text-red-500'
                          }`}>
                            {stock.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span>{stock.change > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium font-mono">{stock.volume}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right column - 1/3 width */}
        <div className="space-y-6">
          {/* Daily News */}
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card">
              <CardTitle className="text-lg font-semibold text-foreground">Daily News</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {dailyNews.map((news, index) => (
                  <div 
                    key={index} 
                    className="group cursor-pointer pb-4 border-b border-border last:border-0 last:pb-0 hover:bg-accent/30 -mx-4 px-4 py-3 rounded-lg transition-colors"
                  >
                    <a href={news.url} className="block">
                      <h3 className="font-semibold text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                        {news.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground font-medium">{news.source}</span>
                        <span className="text-xs text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground">{news.time}</span>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;