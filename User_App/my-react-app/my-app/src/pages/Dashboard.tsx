import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getStockNews, getMarketNews } from "@/endpoint_connections/news_endpoint";
import { getInsiderSentiment } from "@/endpoint_connections/sentiment_endpoint";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";


type MarketNewsItem = {
  headline?: string;
  source?: string;
  url?: string;
  datetime?: number;
  summary?: string;
};

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

const companyNewsCache = new Map<string, CompanyNewsItem[]>();
const sentimentCache = new Map<string, InsiderSentimentResponse>();

const Dashboard = () => {
  const recentAlerts = [
    { id: 1, time: "10:23 AM", symbol: "AAPL", type: "Price", confidence: "High", change: "+2.3%" },
    { id: 2, time: "09:45 AM", symbol: "TSLA", type: "Volume", confidence: "Medium", change: "+15.2%" },
    { id: 3, time: "09:12 AM", symbol: "MSFT", type: "Price", confidence: "High", change: "-1.1%" },
  ];

  const watchedSymbols = [
    { symbol: "AAPL", lastPrice: 178.23, volume: "52.3M", change: 2.3, changePercent: 1.31 },
    { symbol: "TSLA", lastPrice: 242.84, volume: "98.7M", change: -3.21, changePercent: -1.30 },
    { symbol: "MSFT", lastPrice: 412.56, volume: "28.1M", change: 5.67, changePercent: 1.39 },
    { symbol: "GOOGL", lastPrice: 142.33, volume: "31.4M", change: 1.23, changePercent: 0.87 },
  ];

  const [marketNews, setMarketNews] = useState<MarketNewsItem[]>([]);
  const [marketNewsLoading, setMarketNewsLoading] = useState(false);
  const [marketNewsError, setMarketNewsError] = useState<string | null>(null);

  const [companyNewsBySymbol, setCompanyNewsBySymbol] = useState<Record<string, CompanyNewsItem[]>>({});
  const [sentimentBySymbol, setSentimentBySymbol] = useState<Record<string, InsiderSentimentResponse>>({});
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const watchSymbolsList = useMemo(
    () => watchedSymbols.map((s) => s.symbol.toUpperCase()),
    [watchedSymbols]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setMarketNewsLoading(true);
        setMarketNewsError(null);

        const data = await getMarketNews("general");
        if (cancelled) return;

        setMarketNews(Array.isArray(data) ? (data as MarketNewsItem[]) : []);
      } catch (e: any) {
        if (cancelled) return;
        setMarketNewsError(e?.message ?? "Failed to load market news");
        setMarketNews([]);
      } finally {
        if (!cancelled) setMarketNewsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const newsMap: Record<string, CompanyNewsItem[]> = {};
    const sentimentMap: Record<string, InsiderSentimentResponse> = {};

    for (const sym of watchSymbolsList) {
      newsMap[sym] = companyNewsCache.get(sym) ?? [];
      sentimentMap[sym] = sentimentCache.get(sym) ?? {};
    }

    setCompanyNewsBySymbol(newsMap);
    setSentimentBySymbol(sentimentMap);
  }, [watchSymbolsList]);

  const getLatestInsiderMspr = (symbol: string) => {
    const s = sentimentBySymbol[symbol]?.data;
    if (!s || s.length === 0) return null;
    const latest = s[s.length - 1];
    return typeof latest?.mspr === "number" ? latest.mspr : null;
  };

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const refreshWatchlistData = async () => {
  setCompanyLoading(true);
  setCompanyError(null);

  let hadAnyError = false;

  for (const sym of watchSymbolsList) {
    try {
      const news = await getStockNews(sym);
      const newsArr = Array.isArray(news) ? (news as CompanyNewsItem[]) : [];

      companyNewsCache.set(sym, newsArr);
      setCompanyNewsBySymbol((p) => ({ ...p, [sym]: newsArr }));
    
    
    
    
    } catch (e) {
      hadAnyError = true;
    }


    await delay(600);

    try {
      const sentiment = await getInsiderSentiment(sym);
      const sentObj = (sentiment ?? {}) as InsiderSentimentResponse;

      sentimentCache.set(sym, sentObj);
      setSentimentBySymbol((p) => ({ ...p, [sym]: sentObj }));


    console.log("Sentiment:", sentObj);
    } catch (e) {
      hadAnyError = true;
    }

    

    await delay(600);
  }

  if (hadAnyError) {
    setCompanyError("Some symbols failed to refresh (likely rate limit). Try again in ~30–60s.");
  }

  

  setCompanyLoading(false);
};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
                        <span
                          className={`ml-2 text-xs ${
                            alert.change.startsWith("+") ? "text-emerald-500" : "text-red-500"
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
                            alert.confidence === "High"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
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

          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground">
                Watched Symbols Activity
                {companyLoading ? (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">Refreshing…</span>
                ) : null}
                {companyError ? (
                  <span className="ml-2 text-xs text-red-500 font-normal">{companyError}</span>
                ) : null}
              </CardTitle>

              <Button onClick={refreshWatchlistData} disabled={companyLoading} variant="secondary">
                {companyLoading ? "Refreshing…" : "Refresh News/Sentiment"}
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="text-muted-foreground font-semibold">Symbol</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Last Price</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Volume</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Insider</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Top News</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchedSymbols.map((stock) => {
                    const sym = stock.symbol.toUpperCase();
                    const topNews = companyNewsBySymbol[sym]?.[0];
                    const mspr = getLatestInsiderMspr(sym);

                    return (
                      <TableRow key={stock.symbol} className="hover:bg-accent/50 transition-colors border-border">
                        <TableCell className="font-semibold text-foreground">{stock.symbol}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground font-mono">${stock.lastPrice.toFixed(2)}</span>
                            <div
                              className={`flex items-center gap-1 text-xs font-medium ${
                                stock.change > 0 ? "text-emerald-500" : "text-red-500"
                              }`}
                            >
                              {stock.change > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              <span>
                                {stock.change > 0 ? "+" : ""}
                                {stock.changePercent.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground font-medium font-mono">{stock.volume}</TableCell>

                        <TableCell>
                          {mspr === null ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={
                                mspr >= 0
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20"
                              }
                              title="MSPR (Monthly Share Purchase Ratio)"
                            >
                              MSPR {mspr >= 0 ? "+" : ""}
                              {mspr.toFixed(2)}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="max-w-[360px]">
                          {topNews?.url ? (
                            <a
                              href={topNews.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-foreground hover:text-primary line-clamp-1"
                              title={topNews.headline}
                            >
                              {topNews.headline ?? "View article"}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No cached articles (click Refresh)
                            </span>
                          )}
                          {topNews?.source || topNews?.datetime ? (
                            <div className="text-xs text-muted-foreground mt-1">
                              {topNews?.source ? topNews.source : ""}
                              {topNews?.source && topNews?.datetime ? " • " : ""}
                              {topNews?.datetime ? timeAgoFromUnixSeconds(topNews.datetime) : ""}
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card">
              <CardTitle className="text-lg font-semibold text-foreground">
                Daily News
                {marketNewsLoading ? (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">Loading…</span>
                ) : null}
                {marketNewsError ? (
                  <span className="ml-2 text-xs text-red-500 font-normal">{marketNewsError}</span>
                ) : null}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4">
              <div className="space-y-4">
                {(marketNews ?? []).slice(0, 8).map((news, index) => {
                  const title = news.headline ?? "Untitled";
                  const source = news.source ?? "Unknown";
                  const time = timeAgoFromUnixSeconds(news.datetime);
                  const url = news.url ?? "#";

                  return (
                    <div
                      key={index}
                      className="group cursor-pointer pb-4 border-b border-border last:border-0 last:pb-0 hover:bg-accent/30 -mx-4 px-4 py-3 rounded-lg transition-colors"
                    >
                      <a href={url} target="_blank" rel="noreferrer" className="block">
                        <h3 className="font-semibold text-sm text-foreground leading-snug group-hover:text-primary transition-colors">
                          {title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground font-medium">{source}</span>
                          {time ? <span className="text-xs text-muted-foreground/50">•</span> : null}
                          {time ? <span className="text-xs text-muted-foreground">{time}</span> : null}
                        </div>
                      </a>
                    </div>
                  );
                })}

                {!marketNewsLoading && marketNews.length === 0 && !marketNewsError ? (
                  <div className="text-sm text-muted-foreground">No market news returned.</div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;