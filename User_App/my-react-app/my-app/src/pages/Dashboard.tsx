import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { useWatchlist } from "@/context/WatchlistContext";
import { getAlertHistory } from "@/endpoint_connections/alerts_endpoint";
import { getStockNews, getMarketNews } from "@/endpoint_connections/news_endpoint";
import { getInsiderSentiment } from "@/endpoint_connections/sentiment_endpoint";
import { getRecentSignals } from "@/endpoint_connections/signals_endpoint";
import type { DetectionSignal } from "@/endpoint_connections/signals_endpoint";
import TickerTape from "@/components/TickerTape";
import type {
  AlertHistoryItem,
  MarketNewsItem,
  CompanyNewsItem,
  InsiderSentimentResponse,
} from "@/lib/types";
import {
  timeAgoFromUnixSeconds,
  formatTime,
  formatDate,
  formatPrice,
  formatSize,
  delay,
} from "@/lib/utils";

const newsCache = new Map<string, CompanyNewsItem[]>();
const sentimentCache = new Map<string, InsiderSentimentResponse>();

// ── signal helpers ──────────────────────────────────────────────────────────

function strengthColor(strength: string) {
  switch (strength) {
    case "strong":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "moderate":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "weak":
      return "bg-muted/50 text-muted-foreground border-border";
    default:
      return "bg-muted/50 text-muted-foreground border-border";
  }
}

function directionColor(dir: string | null) {
  if (dir === "buy") return "text-emerald-500";
  if (dir === "sell") return "text-red-500";
  return "text-muted-foreground";
}

// ── signal row with expandable detail ──────────────────────────────────────

const SignalRow = ({ signal }: { signal: DetectionSignal }) => {
  const [expanded, setExpanded] = useState(false);
  const { convergence, bar, timeframes } = signal;
  const barTime = bar?.t;

  return (
    <>
      <TableRow
        className="hover:bg-accent/50 transition-colors border-border cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <TableCell className="text-muted-foreground text-sm">
          <div>{formatTime(barTime)}</div>
          <div className="text-xs text-muted-foreground/60">
            {formatDate(barTime)}
          </div>
        </TableCell>

        <TableCell className="font-bold font-mono text-foreground">
          {signal.symbol}
        </TableCell>

        <TableCell>
          <Badge
            variant="outline"
            className={strengthColor(convergence.signal_strength)}
          >
            {convergence.signal_strength}
          </Badge>
        </TableCell>

        <TableCell>
          <span
            className={`text-sm font-medium ${directionColor(convergence.ofi_direction)}`}
          >
            {convergence.ofi_direction
              ? convergence.ofi_direction.charAt(0).toUpperCase() +
                convergence.ofi_direction.slice(1)
              : "—"}
          </span>
        </TableCell>

        <TableCell className="text-right text-muted-foreground">
          {expanded ? (
            <ChevronDown className="w-4 h-4 ml-auto" />
          ) : (
            <ChevronRight className="w-4 h-4 ml-auto" />
          )}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="border-border bg-muted/10">
          <TableCell colSpan={5} className="py-3 px-4">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {Object.entries(timeframes).map(([w, tf]) => (
                <div key={w} className="space-y-1.5">
                  <div className="font-semibold text-muted-foreground uppercase tracking-wide">
                    {w}m window
                  </div>

                  {tf.methods.volume_impact?.warmed_up ? (
                    <div className="space-y-0.5">
                      <div className="text-foreground">
                        Impact:{" "}
                        <span className="font-mono">
                          {(
                            (tf.methods.volume_impact.impact_ratio ?? 0) * 100
                          ).toFixed(1)}
                          %
                        </span>
                        {tf.methods.volume_impact.impact_classification && (
                          <span className="ml-1.5 text-muted-foreground">
                            ({tf.methods.volume_impact.impact_classification})
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        Z-score:{" "}
                        <span className="font-mono">
                          {tf.methods.volume_impact.volume_z_score?.toFixed(2) ??
                            "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground/50">
                      Vol impact warming up
                    </div>
                  )}

                  {tf.methods.ofi?.warmed_up ? (
                    <div className="space-y-0.5">
                      <div className="text-foreground">
                        OFI:{" "}
                        <span
                          className={`font-mono ${
                            (tf.methods.ofi.normalized_ofi ?? 0) > 0.1
                              ? "text-emerald-500"
                              : (tf.methods.ofi.normalized_ofi ?? 0) < -0.1
                              ? "text-red-500"
                              : ""
                          }`}
                        >
                          {tf.methods.ofi.normalized_ofi?.toFixed(3) ?? "—"}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Buy ratio:{" "}
                        <span className="font-mono">
                          {(
                            (tf.methods.ofi.buy_ratio ?? 0) * 100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground/50">
                      OFI warming up
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
              <span>
                Bar: O{" "}
                <span className="font-mono text-foreground">
                  ${bar?.o?.toFixed(2)}
                </span>{" "}
                H{" "}
                <span className="font-mono text-foreground">
                  ${bar?.h?.toFixed(2)}
                </span>{" "}
                L{" "}
                <span className="font-mono text-foreground">
                  ${bar?.l?.toFixed(2)}
                </span>{" "}
                C{" "}
                <span className="font-mono text-foreground">
                  ${bar?.c?.toFixed(2)}
                </span>
              </span>
              <span>
                Vol{" "}
                <span className="font-mono text-foreground">
                  {bar?.v?.toLocaleString()}
                </span>
              </span>
              {bar?.vw && (
                <span>
                  VWAP{" "}
                  <span className="font-mono text-foreground">
                    ${bar.vw.toFixed(2)}
                  </span>
                </span>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// ── main component ──────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user, token } = useAuth();
  const userId = user?.id;
  const { symbols } = useWatchlist();

  const [marketNews, setMarketNews] = useState<MarketNewsItem[]>([]);
  const [marketNewsLoading, setMarketNewsLoading] = useState(false);
  const [marketNewsError, setMarketNewsError] = useState<string | null>(null);

  const [newsBySymbol, setNewsBySymbol] = useState<Record<string, CompanyNewsItem[]>>({});
  const [sentimentBySymbol, setSentimentBySymbol] = useState<Record<string, InsiderSentimentResponse>>({});
  const [symbolDataLoading, setSymbolDataLoading] = useState(false);
  const [symbolDataError, setSymbolDataError] = useState<string | null>(null);

  const [recentAlerts, setRecentAlerts] = useState<AlertHistoryItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const [signals, setSignals] = useState<DetectionSignal[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsError, setSignalsError] = useState<string | null>(null);

  // market news
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setMarketNewsLoading(true);
        setMarketNewsError(null);
        const data = await getMarketNews("general");
        if (cancelled) return;
        setMarketNews(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (cancelled) return;
        setMarketNewsError(e instanceof Error ? e.message : "Failed to load market news");
      } finally {
        if (!cancelled) setMarketNewsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // alerts
  const fetchAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true);
      setAlertsError(null);
      if (!token) return;
      const data = await getAlertHistory(token);
      setRecentAlerts(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setAlertsError(e instanceof Error ? e.message : "Failed to load alerts");
      setRecentAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // signals
  const fetchSignals = useCallback(async () => {
    if (!token) return;
    try {
      setSignalsLoading(true);
      setSignalsError(null);
      const data = await getRecentSignals(token);
      // filter to strong/moderate only for dashboard summary
      setSignals(
        data.filter((s) =>
          s.convergence.signal_strength === "strong" ||
          s.convergence.signal_strength === "moderate"
        )
      );
    } catch (e: unknown) {
      setSignalsError(e instanceof Error ? e.message : "Failed to load signals");
      setSignals([]);
    } finally {
      setSignalsLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  // symbol data seed from cache
  useEffect(() => {
    const news: Record<string, CompanyNewsItem[]> = {};
    const sentiment: Record<string, InsiderSentimentResponse> = {};
    for (const { symbol } of symbols) {
      news[symbol] = newsCache.get(symbol) ?? [];
      sentiment[symbol] = sentimentCache.get(symbol) ?? {};
    }
    setNewsBySymbol(news);
    setSentimentBySymbol(sentiment);
  }, [symbols]);

  const refreshSymbolData = async () => {
    if (symbols.length === 0) return;
    setSymbolDataLoading(true);
    setSymbolDataError(null);
    let hadError = false;

    for (const { symbol } of symbols) {
      try {
        const news = await getStockNews(symbol);
        const arr = Array.isArray(news) ? (news as CompanyNewsItem[]) : [];
        newsCache.set(symbol, arr);
        setNewsBySymbol((p) => ({ ...p, [symbol]: arr }));
      } catch {
        hadError = true;
      }

      await delay(400);

      try {
        const s = await getInsiderSentiment(symbol);
        const obj = (s ?? {}) as InsiderSentimentResponse;
        if (obj?.data && obj.data.length > 0) {
          console.log(`[sentiment] ${symbol} → ok`, obj);
        } else {
          console.warn(`[sentiment] ${symbol} → ok but no data`, obj);
        }
        sentimentCache.set(symbol, obj);
        setSentimentBySymbol((p) => ({ ...p, [symbol]: obj }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[sentiment] ${symbol} → failed`, msg);
        hadError = true;
      }

      await delay(400);
    }

    if (hadError)
      setSymbolDataError("Some symbols failed to refresh — try again in ~30s");
    setSymbolDataLoading(false);
  };

  const getLatestMspr = (symbol: string): number | null => {
    const data = sentimentBySymbol[symbol]?.data;
    if (!data || data.length === 0) return null;
    const latest = data[data.length - 1];
    return typeof latest?.mspr === "number" ? latest.mspr : null;
  };

  return (
    <div className="space-y-6">
      <TickerTape />

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* ── Recent Alerts ── */}
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                Recent Alerts
                {alertsLoading && (
                  <span className="text-xs text-muted-foreground font-normal">Loading…</span>
                )}
                {alertsError && (
                  <span className="text-xs text-red-500 font-normal">{alertsError}</span>
                )}
              </CardTitle>
              <Button onClick={fetchAlerts} disabled={alertsLoading} variant="secondary" size="sm">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${alertsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="text-muted-foreground font-semibold">Time</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Symbol</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right">Price</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right">Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAlerts.slice(0, 5).map((alert) => (
                    <TableRow key={alert.id} className="hover:bg-accent/50 transition-colors border-border">
                      <TableCell className="text-muted-foreground text-sm">
                        <div>{formatTime(alert.sent)}</div>
                        <div className="text-xs text-muted-foreground/60">{formatDate(alert.sent)}</div>
                      </TableCell>
                      <TableCell className="font-bold font-mono text-foreground">{alert.symbol ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono text-foreground text-sm">{formatPrice(alert.price)}</TableCell>
                      <TableCell className="text-right font-mono text-foreground text-sm">{formatSize(alert.size)}</TableCell>
                    </TableRow>
                  ))}
                  {!alertsLoading && recentAlerts.length === 0 && !alertsError && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground py-8 text-center">
                        No alerts yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ── Detection Signals ── */}
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                Detection Signals
                {signalsLoading && (
                  <span className="text-xs text-muted-foreground font-normal">Loading…</span>
                )}
                {signalsError && (
                  <span className="text-xs text-red-500 font-normal">{signalsError}</span>
                )}
              </CardTitle>
              <Button onClick={fetchSignals} disabled={signalsLoading} variant="secondary" size="sm">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${signalsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="text-muted-foreground font-semibold">Time</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Symbol</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Strength</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Direction</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.slice(0, 10).map((signal, i) => (
                    <SignalRow key={i} signal={signal} />
                  ))}
                  {!signalsLoading && signals.length === 0 && !signalsError && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground py-8 text-center">
                        No strong or moderate signals yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ── Watched Symbols Activity ── */}
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                Watched Symbols Activity
                {symbolDataLoading && (
                  <span className="text-xs text-muted-foreground font-normal">Refreshing…</span>
                )}
                {symbolDataError && (
                  <span className="text-xs text-red-500 font-normal">{symbolDataError}</span>
                )}
              </CardTitle>
              <Button onClick={refreshSymbolData} disabled={symbolDataLoading || symbols.length === 0} variant="secondary" size="sm">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${symbolDataLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="text-muted-foreground font-semibold">Symbol</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Insider MSPR</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Top News</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {symbols.map(({ symbol }) => {
                    const topNews = newsBySymbol[symbol]?.[0];
                    const mspr = getLatestMspr(symbol);
                    return (
                      <TableRow key={symbol} className="hover:bg-accent/50 transition-colors border-border">
                        <TableCell className="font-bold font-mono text-foreground">{symbol}</TableCell>
                        <TableCell>
                          {mspr === null ? (
                            <span className="text-xs text-muted-foreground">— click Refresh</span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={mspr >= 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}
                              title="Monthly Share Purchase Ratio — positive means net insider buying"
                            >
                              {mspr >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                              {mspr >= 0 ? "+" : ""}{mspr.toFixed(2)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[360px]">
                          {topNews?.url ? (
                            <a href={topNews.url} target="_blank" rel="noreferrer"
                              className="text-sm text-foreground hover:text-primary line-clamp-1 transition-colors"
                              title={topNews.headline}>
                              {topNews.headline ?? "View article"}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">No cached articles — click Refresh</span>
                          )}
                          {(topNews?.source || topNews?.datetime) && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {topNews.source}
                              {topNews.source && topNews.datetime ? " · " : ""}
                              {topNews.datetime ? timeAgoFromUnixSeconds(topNews.datetime) : ""}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {symbols.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-sm text-muted-foreground py-8 text-center">
                        Add symbols in Watchlists to see activity here.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* ── Daily News sidebar ── */}
        <div>
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                Daily News
                {marketNewsLoading && (
                  <span className="text-xs text-muted-foreground font-normal">Loading…</span>
                )}
                {marketNewsError && (
                  <span className="text-xs text-red-500 font-normal">{marketNewsError}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-1">
                {marketNews.slice(0, 8).map((news, i) => (
                  <a key={i} href={news.url ?? "#"} target="_blank" rel="noreferrer"
                    className="group block -mx-4 px-4 py-3 rounded-lg hover:bg-accent/30 transition-colors border-b border-border last:border-0">
                    <h3 className="font-semibold text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {news.headline ?? "Untitled"}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground font-medium">{news.source ?? "Unknown"}</span>
                      {news.datetime ? (
                        <>
                          <span className="text-xs text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground">{timeAgoFromUnixSeconds(news.datetime)}</span>
                        </>
                      ) : null}
                    </div>
                  </a>
                ))}
                {!marketNewsLoading && marketNews.length === 0 && !marketNewsError && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No market news returned.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;