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
import { getMarketNews } from "@/endpoint_connections/news_endpoint";
import { getAlertHistory, createAlert } from "@/endpoint_connections/alerts_endpoint";
import { ExternalLink } from "lucide-react";

type MarketNewsItem = {
  headline?: string;
  source?: string;
  url?: string;
  datetime?: number;
  summary?: string;
};

type AlertHistoryItem = {
  id: number;
  alert_id: number;
  confidence: number;
  sent: string;
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

function timeFromIso(sentIso?: string) {
  if (!sentIso) return "";
  const d = new Date(sentIso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function confidenceLabel(conf?: number) {
  if (typeof conf !== "number") return "—";
  if (conf >= 0.75) return "High";
  if (conf >= 0.5) return "Medium";
  return "Low";
}

const Dashboard = () => {
  const watchedSymbols: Array<{
    symbol: string;
    lastPrice: number;
    volume: string;
    change: number;
    changePercent: number;
  }> = [];

  const [marketNews, setMarketNews] = useState<MarketNewsItem[]>([]);
  const [marketNewsLoading, setMarketNewsLoading] = useState(false);
  const [marketNewsError, setMarketNewsError] = useState<string | null>(null);

  const [recentAlerts, setRecentAlerts] = useState<AlertHistoryItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  const userId = 1;

  const [assetSymbol, setAssetSymbol] = useState("");
  const [alertType, setAlertType] = useState("size");
  const [threshold, setThreshold] = useState("");
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
    let cancelled = false;

    async function loadAlerts() {
      try {
        setAlertsLoading(true);
        setAlertsError(null);
        const data = await getAlertHistory(userId);
        if (cancelled) return;
        setRecentAlerts(Array.isArray(data) ? (data as AlertHistoryItem[]) : []);
      } catch (e: any) {
        if (cancelled) return;
        setAlertsError(e?.message ?? "Failed to load alerts");
        setRecentAlerts([]);
      } finally {
        if (!cancelled) setAlertsLoading(false);
      }
    }

    loadAlerts();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refreshAlerts = async () => {
    try {
      setAlertsLoading(true);
      setAlertsError(null);
      const data = await getAlertHistory(userId);
      setRecentAlerts(Array.isArray(data) ? (data as AlertHistoryItem[]) : []);
    } catch (e: any) {
      setAlertsError(e?.message ?? "Failed to load alerts");
      setRecentAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const onCreateAlert = async () => {
    try {
      setCreateLoading(true);
      setCreateError(null);

      const sym = assetSymbol.trim().toUpperCase();
      const thr = Number(threshold);

      if (!sym) throw new Error("Asset symbol is required");
      if (!Number.isFinite(thr)) throw new Error("Threshold must be a number");

      await createAlert({
        user_id: userId,
        asset_symbol: sym,
        alert_type: alertType,
        threshold: thr,
        email,
        sms,
      });

      setAssetSymbol("");
      setThreshold("");
      await refreshAlerts();
    } catch (e: any) {
      setCreateError(e?.message ?? "Failed to create alert");
    } finally {
      setCreateLoading(false);
    }
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
              <CardTitle className="text-lg font-semibold text-foreground">Create Alert</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Symbol</div>
                  <input
                    value={assetSymbol}
                    onChange={(e) => setAssetSymbol(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="AAPL"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Type</div>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="size">size</option>

                  </select>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Threshold</div>
                  <input
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={email}
                    onChange={(e) => setEmail(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={sms}
                    onChange={(e) => setSms(e.target.checked)}
                    className="h-4 w-4"
                  />
                  SMS
                </label>

                <Button onClick={onCreateAlert} disabled={createLoading} variant="secondary">
                  {createLoading ? "Creating…" : "Create Alert"}
                </Button>

                {createError ? <span className="text-xs text-red-500">{createError}</span> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground">
                Recent Alert
                {alertsLoading ? <span className="ml-2 text-xs text-muted-foreground font-normal">Loading…</span> : null}
                {alertsError ? <span className="ml-2 text-xs text-red-500 font-normal">{alertsError}</span> : null}
              </CardTitle>

              <Button onClick={refreshAlerts} disabled={alertsLoading} variant="secondary">
                {alertsLoading ? "Loading…" : "Refresh Alerts"}
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="text-muted-foreground font-semibold">Time</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Alert ID</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Confidence</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAlerts.map((event) => {
                    const label = confidenceLabel(event.confidence);

                    return (
                      <TableRow key={event.id} className="hover:bg-accent/50 transition-colors border-border">
                        <TableCell className="font-medium text-muted-foreground">{timeFromIso(event.sent)}</TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground">{event.alert_id}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              label === "High"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : label === "Medium"
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  : label === "Low"
                                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                                    : "bg-muted/50 border-border"
                            }
                          >
                            {label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {!alertsLoading && recentAlerts.length === 0 && !alertsError ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground py-6 text-center">
                        No alert history returned.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="border-b border-border bg-card flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground">Watched Symbols Activity</CardTitle>
              <Button disabled variant="secondary">
                Refresh News/Sentiment
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
                  {watchSymbolsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground py-6 text-center">
                        No watched symbols yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
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
                {marketNewsLoading ? <span className="ml-2 text-xs text-muted-foreground font-normal">Loading…</span> : null}
                {marketNewsError ? <span className="ml-2 text-xs text-red-500 font-normal">{marketNewsError}</span> : null}
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