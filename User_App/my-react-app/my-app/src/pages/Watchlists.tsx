import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Info } from "lucide-react";
import { getStockNews } from "@/endpoint_connections/news_endpoint";
import { getInsiderSentiment } from "@/endpoint_connections/sentiment_endpoint";

declare global { 
  interface Window { 
    TradingView?: any; 
  } 
} 

type CompanyNewsItem = {
  headline?: string;
  source?: string;
  url?: string;
  datetime?: number;
  summary?: string;
};

type InsiderSentimentResponse = {
  symbol?: string;
  data?: Array<{
    month?: string;
    mspr?: number;
    change?: number;
  }>;
};

function timeAgoFromUnixSeconds(unix?: number) {
  if (!unix) return "";
  const ms = unix * 1000;
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function useTradingViewEmbed(
  containerRef: React.RefObject<HTMLDivElement>,
  scriptSrc: string,
  config: Record<string, any>,
  deps: any[]
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let widget = container.querySelector<HTMLDivElement>(
      ".tradingview-widget-container__widget"
    );
    if (!widget) {
      widget = document.createElement("div");
      widget.className = "tradingview-widget-container__widget";
      container.appendChild(widget);
    }

    widget.innerHTML = "";
    container.querySelectorAll("script").forEach((s) => s.remove());

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);

    return () => {
      widget?.replaceChildren();
      container.querySelectorAll("script").forEach((s) => s.remove());
    };
  }, deps);
}

const TradingViewWidget = ({ symbol }: { symbol: string }) => {
  const containerIdRef = useRef(
    `tradingview_chart_${Math.random().toString(36).slice(2)}`
  );
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    const containerId = containerIdRef.current;
    const tvSymbol = symbol.includes(":") ? symbol : `NASDAQ:${symbol}`;

    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";

    const init = () => {
      if (!window.TradingView) return;
      new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        container_id: containerId,
        height: 400,
      });
    };

    if (!scriptLoadedRef.current) {
      const existing = document.querySelector(
        'script[src="https://s3.tradingview.com/tv.js"]'
      );
      if (existing) {
        scriptLoadedRef.current = true;
        init();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        init();
      };
      document.head.appendChild(script);
    } else {
      init();
    }
  }, [symbol]);

  return <div id={containerIdRef.current} className="w-full h-[400px]" />;
};

const MiniChartWidget = ({ symbol }: { symbol: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tvSymbol = symbol.includes(":") ? symbol : `NASDAQ:${symbol}`;

  useTradingViewEmbed(
    containerRef,
    "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js",
    {
      symbol: tvSymbol,
      width: "100%",
      height: "100%",
      locale: "en",
      dateRange: "12M",
      colorTheme: "dark",
      isTransparent: true,
      autosize: true,
      largeChartUrl: "",
    },
    [tvSymbol]
  );

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full h-[100px]"
    />
  );
};

const FinData = ({ symbol }: { symbol: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tvSymbol = symbol.includes(":") ? symbol : `NASDAQ:${symbol}`;

  useTradingViewEmbed(
    containerRef,
    "https://s3.tradingview.com/external-embedding/embed-widget-financials.js",
    {
      symbol: tvSymbol,
      colorTheme: "dark",
      displayMode: "regular",
      isTransparent: true,
      locale: "en",
      width: "100%",
      height: 600,
    },
    [tvSymbol]
  );

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full min-h-[600px]"
    />
  );
};

const companyNewsCache = new Map<string, CompanyNewsItem[]>();
const sentimentCache = new Map<string, InsiderSentimentResponse>();

const Watchlists = () => {
  const [symbols, setSymbols] = useState([
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 178.23,
      change: 2.3,
      changePercent: 1.31,
      volume: "52.3M",
    },
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0]);
  const [newSymbol, setNewSymbol] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);

  const [companyNewsBySymbol, setCompanyNewsBySymbol] = useState<
    Record<string, CompanyNewsItem[]>
  >({});
  const [sentimentBySymbol, setSentimentBySymbol] = useState<
    Record<string, InsiderSentimentResponse>
  >({});
  const [loadingBySymbol, setLoadingBySymbol] = useState<Record<string, boolean>>(
    {}
  );
  const [errorBySymbol, setErrorBySymbol] = useState<Record<string, string | null>>(
    {}
  );

  const symbolsUpper = useMemo(
    () => symbols.map((s) => s.symbol.toUpperCase()),
    [symbols]
  );

  useEffect(() => {
    const nextNews: Record<string, CompanyNewsItem[]> = {};
    const nextSent: Record<string, InsiderSentimentResponse> = {};
    for (const sym of symbolsUpper) {
      nextNews[sym] = companyNewsCache.get(sym) ?? [];
      nextSent[sym] = sentimentCache.get(sym) ?? {};
    }
    setCompanyNewsBySymbol(nextNews);
    setSentimentBySymbol(nextSent);
  }, [symbolsUpper]);

  const searchForSymbol = () => {
    if (!searchSymbol.trim()) return;
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
  };

  const addSymbol = () => {
    const sym = newSymbol.trim().toUpperCase();
    if (!sym) return;
    if (symbols.find((s) => s.symbol === sym)) return;

    const newEntry = {
      symbol: sym,
      name: `${sym} Company`,
      price: Math.random() * 500 + 50,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5,
      volume: `${(Math.random() * 100 + 10).toFixed(1)}M`,
    };

    setSymbols((prev) => [...prev, newEntry]);
    setSelectedSymbol(newEntry);
    setNewSymbol("");
  };

  const addSearchedSymbol = () => {
    if (!searchResult) return;
    if (symbols.find((s) => s.symbol === searchResult.symbol)) return;
    setSymbols((prev) => [...prev, searchResult]);
    setSearchResult(null);
    setSearchSymbol("");
  };

  const removeSymbol = (symbol: string) => {
    const filtered = symbols.filter((s) => s.symbol !== symbol);
    setSymbols(filtered);
    if (selectedSymbol?.symbol === symbol && filtered.length > 0) {
      setSelectedSymbol(filtered[0]);
    }
  };

  const getLatestInsiderMspr = (symbol: string) => {
    const s = sentimentBySymbol[symbol]?.data;
    if (!s || s.length === 0) return null;
    const latest = s[s.length - 1];
    return typeof latest?.mspr === "number" ? latest.mspr : null;
  };

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const refreshSymbolData = async (symRaw: string) => {
  const sym = symRaw.toUpperCase().trim();
  if (!sym) return;

  setLoadingBySymbol((p) => ({ ...p, [sym]: true }));
  setErrorBySymbol((p) => ({ ...p, [sym]: null }));

  let hadError = false;

  try {
    const news = await getStockNews(sym);
    const newsArr = Array.isArray(news) ? (news as CompanyNewsItem[]) : [];
    companyNewsCache.set(sym, newsArr);
    setCompanyNewsBySymbol((p) => ({ ...p, [sym]: newsArr }));
  } catch (e: any) {
    hadError = true;
  }

  await delay(600);

  try {
    const sentiment = await getInsiderSentiment(sym);
    const sentObj = (sentiment ?? {}) as InsiderSentimentResponse;
    sentimentCache.set(sym, sentObj);
    setSentimentBySymbol((p) => ({ ...p, [sym]: sentObj }));
  } catch (e: any) {
    hadError = true;
  }

  if (hadError) {
    setErrorBySymbol((p) => ({
      ...p,
      [sym]: "Refresh partially failed (likely rate limit). Try again shortly.",
    }));
  }

  setLoadingBySymbol((p) => ({ ...p, [sym]: false }));
};

  const refreshAllWatchlist = async () => {
    for (const sym of symbolsUpper) {
      await refreshSymbolData(sym);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  const selectedSym = selectedSymbol?.symbol?.toUpperCase() ?? "";
  const selectedTopNews = selectedSym ? companyNewsBySymbol[selectedSym]?.[0] : null;
  const selectedMspr = selectedSym ? getLatestInsiderMspr(selectedSym) : null;
  const selectedLoading = selectedSym ? !!loadingBySymbol[selectedSym] : false;
  const selectedError = selectedSym ? errorBySymbol[selectedSym] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Watchlists
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card pb-4">
              <CardTitle className="text-lg font-semibold text-foreground">
                Search Symbol
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search TSLA, GOOGL..."
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchForSymbol()}
                    className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    onClick={searchForSymbol}
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >
                    Search
                  </Button>
                </div>

                {searchResult && (
                  <div className="p-3 bg-accent/30 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-foreground">
                        {searchResult.symbol}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-muted/50 border-border text-xs"
                      >
                        Preview
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      {searchResult.name}
                    </div>
                    <Button
                      onClick={addSearchedSymbol}
                      size="sm"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={symbols.some((s) => s.symbol === searchResult.symbol)}
                    >
                      {symbols.some((s) => s.symbol === searchResult.symbol)
                        ? "Already Added"
                        : "Add to Watchlist"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card pb-4">
              <CardTitle className="text-lg font-semibold text-foreground">
                Add Symbol
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="AAPL"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSymbol()}
                  className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  onClick={addSymbol}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card pb-4">
              <CardTitle className="text-lg font-semibold text-foreground">
                Watchlist
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Button
                  onClick={refreshAllWatchlist}
                  variant="secondary"
                  className="w-full"
                >
                  Refresh All News/Sentiment
                </Button>
              </div>
            </CardContent>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="text-muted-foreground font-semibold">
                      Symbol
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Remove
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Info
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {symbols.map((stock) => {
                    const sym = stock.symbol.toUpperCase();
                    const isSel = selectedSymbol?.symbol === stock.symbol;
                    return (
                      <TableRow
                        key={stock.symbol}
                        className={`hover:bg-accent/50 transition-colors border-border cursor-pointer ${
                          isSel ? "bg-accent/30" : ""
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
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedSymbol && (
            <>
              <Card className="border-border">
                <MiniChartWidget symbol={selectedSymbol.symbol} />
              </Card>

              <Card className="border-border">
                <CardHeader className="border-b border-border bg-card flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {selectedSymbol.symbol} News & Sentiment
                    {selectedError ? (
                      <span className="ml-2 text-xs text-red-500 font-normal">
                        {selectedError}
                      </span>
                    ) : null}
                  </CardTitle>
                  <Button
                    onClick={() => refreshSymbolData(selectedSymbol.symbol)}
                    disabled={selectedLoading}
                    variant="secondary"
                  >
                    {selectedLoading ? "Refreshing…" : "Refresh"}
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Insider MSPR:</span>
                    {selectedMspr === null ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <Badge
                        variant="outline"
                        className={
                          selectedMspr >= 0
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }
                        title="MSPR (Monthly Share Purchase Ratio)"
                      >
                        MSPR {selectedMspr >= 0 ? "+" : ""}
                        {selectedMspr.toFixed(2)}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-foreground mb-1">
                      Top Company News
                    </div>
                    {selectedTopNews?.url ? (
                      <a
                        href={selectedTopNews.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-foreground hover:text-primary"
                        title={selectedTopNews.headline}
                      >
                        {selectedTopNews.headline ?? "View article"}
                      </a>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No cached company news yet. Click Refresh.
                      </div>
                    )}
                    {selectedTopNews?.source || selectedTopNews?.datetime ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        {selectedTopNews?.source ? selectedTopNews.source : ""}
                        {selectedTopNews?.source && selectedTopNews?.datetime ? " • " : ""}
                        {selectedTopNews?.datetime
                          ? timeAgoFromUnixSeconds(selectedTopNews.datetime)
                          : ""}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="border-b border-border bg-card">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Price History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <TradingViewWidget symbol={selectedSymbol.symbol} />
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="border-b border-border bg-card">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {selectedSymbol.symbol} Financials
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <FinData symbol={selectedSymbol.symbol} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Watchlists;