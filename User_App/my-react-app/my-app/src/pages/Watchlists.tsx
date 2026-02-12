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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Info, TrendingUp, TrendingDown } from 'lucide-react';

const TradingViewWidget = ({ symbol }: { symbol: string }) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.TradingView !== 'undefined') {
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0a0e14',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: 'tradingview_chart',
          height: 400,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [symbol]);

  return <div id="tradingview_chart" className="w-full h-[400px]" />;
};

const MiniChartWidget = ({ symbol }: { symbol: string }) => {
  useEffect(() => {
    const container = document.getElementById(`minichart_${symbol}`);
    if (container) {
      container.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
      script.async = true;
      script.innerHTML = JSON.stringify({
        symbol: symbol,
        width: '100%',
        height: '100%',
        locale: 'en',
        dateRange: '12M',
        colorTheme: 'dark',
        trendLineColor: 'rgba(6, 182, 212, 1)',
        underLineColor: 'rgba(6, 182, 212, 0.3)',
        underLineBottomColor: 'rgba(6, 182, 212, 0)',
        isTransparent: true,
        autosize: true,
        largeChartUrl: '',
      });
      container.appendChild(script);
    }
  }, [symbol]);

  return <div id={`minichart_${symbol}`} className="w-full h-[100px]" />;
};

const Watchlists = () => {
  const [symbols, setSymbols] = useState([
    { symbol: 'AAPL', name: 'Apple Inc.', price: 178.23, change: 2.3, changePercent: 1.31, volume: '52.3M' },
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0]);
  const [newSymbol, setNewSymbol] = useState('');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);

  const getFinancialData = (symbol: string) => ({
    totalRevenue: '385.67B',
    revenueGrowth: '29.41%',
    grossProfit: '206.14B',
    operatingIncome: '141.87B',
    netIncome: '117.71B',
    epsBasic: '7.60',
    epsDiluted: '2.44',
    totalShares: '14.65B',
    sharesFloat: '14.67B',
    balanceSheet: {
      totalAssets: '378.30B',
      totalLiabilities: '293.31B',
      totalEquity: '85.17B',
    },
    bookValuePerShare: '6.00',
    currentRatio: '0.97',
    debtToEquity: '1.03',
    assetTurnover: '1.20',
  });

  const financialData = selectedSymbol ? getFinancialData(selectedSymbol.symbol) : null;

  const searchForSymbol = () => {
    if (searchSymbol.trim()) {
      const symbol = searchSymbol.trim().toUpperCase();
      const mockResult = {
        symbol,
        name: `${symbol} Company`,
        price: Math.random() * 500 + 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: `${(Math.random() * 100 + 10).toFixed(1)}M`,
      };
      setSearchResult(mockResult);
      setSelectedSymbol(mockResult);
    }
  };

  const addSymbol = () => {
    if (newSymbol.trim() && !symbols.find(s => s.symbol === newSymbol.trim().toUpperCase())) {
      const symbol = newSymbol.trim().toUpperCase();
      const newEntry = {
        symbol,
        name: `${symbol} Company`,
        price: Math.random() * 500 + 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: `${(Math.random() * 100 + 10).toFixed(1)}M`,
      };
      setSymbols([...symbols, newEntry]);
      setSelectedSymbol(newEntry);
      setNewSymbol('');
    }
  };

  const addSearchedSymbol = () => {
    if (searchResult && !symbols.find(s => s.symbol === searchResult.symbol)) {
      setSymbols([...symbols, searchResult]);
      setSearchResult(null);
      setSearchSymbol('');
    }
  };

  const removeSymbol = (symbol: string) => {
    const filtered = symbols.filter(s => s.symbol !== symbol);
    setSymbols(filtered);
    if (selectedSymbol?.symbol === symbol && filtered.length > 0) {
      setSelectedSymbol(filtered[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Watchlists</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card pb-4">
              <CardTitle className="text-lg font-semibold text-foreground">Search Symbol</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search TSLA, GOOGL..."
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchForSymbol()}
                    className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button onClick={searchForSymbol} variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    Search
                  </Button>
                </div>
                {searchResult && (
                  <div className="p-3 bg-accent/30 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-foreground">{searchResult.symbol}</span>
                      <Badge variant="outline" className="bg-muted/50 border-border text-xs">
                        Preview
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">{searchResult.name}</div>
                    <Button 
                      onClick={addSearchedSymbol} 
                      size="sm" 
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={symbols.some(s => s.symbol === searchResult.symbol)}
                    >
                      {symbols.some(s => s.symbol === searchResult.symbol) ? 'Already Added' : 'Add to Watchlist'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card pb-4">
              <CardTitle className="text-lg font-semibold text-foreground">Add Symbol</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="AAPL"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                  className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button onClick={addSymbol} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="text-muted-foreground font-semibold">Symbol</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Remove</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {symbols.map((stock) => (
                    <TableRow 
                      key={stock.symbol} 
                      className={`hover:bg-accent/50 transition-colors border-border cursor-pointer ${
                        selectedSymbol?.symbol === stock.symbol ? 'bg-accent/30' : ''
                      }`}
                    >
                      <TableCell className="font-semibold text-foreground">
                        {stock.symbol}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSymbol(stock.symbol)}
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSymbol(stock)}
                          className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedSymbol && (
            <>
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-foreground">{selectedSymbol.symbol}</h2>
                        <Badge variant="outline" className="bg-muted/50 border-border text-muted-foreground">
                          {selectedSymbol.name}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-baseline gap-3">
                        <span className="text-4xl font-bold text-foreground font-mono">
                          ${selectedSymbol.price.toFixed(2)}
                        </span>
                        <div className={`flex items-center gap-1.5 text-lg font-semibold ${
                          selectedSymbol.change > 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {selectedSymbol.change > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                          <span>{selectedSymbol.change > 0 ? '+' : ''}{selectedSymbol.changePercent.toFixed(2)}%</span>
                          <span className="text-sm">({selectedSymbol.change > 0 ? '+' : ''}{selectedSymbol.change.toFixed(2)})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="border-b border-border bg-card">
                  <CardTitle className="text-lg font-semibold text-foreground">Price History</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <TradingViewWidget symbol={selectedSymbol.symbol} />
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="border-b border-border bg-card">
                  <CardTitle className="text-lg font-semibold text-foreground">{selectedSymbol.symbol} Financials</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Income on Q...</h3>
                      <div className="space-y-2">
                        <DataRow label="Total revenue" value={financialData?.totalRevenue} />
                        <DataRow label="Revenue growth" value={financialData?.revenueGrowth} />
                        <DataRow label="Gross profit" value={financialData?.grossProfit} />
                        <DataRow label="Operating inc..." value={financialData?.operatingIncome} />
                        <DataRow label="Net Income L..." value={financialData?.netIncome} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Return on Val...</h3>
                      <div className="space-y-2">
                        <DataRow label="EPS (Basic) (T...)" value={financialData?.epsBasic} />
                        <DataRow label="EPS Diluted (E...)" value={financialData?.epsDiluted} />
                        <DataRow label="Total shares (...)" value={financialData?.totalShares} />
                        <DataRow label="Shares Float" value={financialData?.sharesFloat} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dividends</h3>
                      <div className="space-y-2">
                        <DataRow label="Total assets (..." value={financialData?.balanceSheet.totalAssets} />
                        <DataRow label="Total liabilitit..." value={financialData?.balanceSheet.totalLiabilities} />
                        <DataRow label="Total equity (..." value={financialData?.balanceSheet.totalEquity} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Most payem...</h3>
                      <div className="space-y-2">
                        <DataRow label="Book value pe..." value={financialData?.bookValuePerShare} />
                        <DataRow label="Current ratio (...)" value={financialData?.currentRatio} />
                        <DataRow label="Debt to equity..." value={financialData?.debtToEquity} />
                        <DataRow label="Asset turnover..." value={financialData?.assetTurnover} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">1 year Dom...</h3>
                      <div className="space-y-2">
                        <DataRow label="52 Week high" value="283.85" />
                        <DataRow label="52 Week low" value="164.21" />
                        <DataRow label="1 Year beta" value="1.32" />
                        <DataRow label="Average volum..." value="63.87M" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sentiment O...</h3>
                      <div className="space-y-2">
                        <DataRow label="Dividend yield..." value="0.32%" />
                        <DataRow label="Dividend paym..." value="13.05%" />
                        <DataRow label="Next payment..." value="2026-02-09" />
                      </div>
                    </div>
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

const DataRow = ({ label, value }: { label: string; value: string | undefined }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground font-mono">{value}</span>
  </div>
);

export default Watchlists;