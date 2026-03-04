import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { ExternalLink, Activity } from "lucide-react";
import { getAlertHistory } from "@/endpoint_connections/alerts_endpoint";

type AlertHistoryItem = {
  id: number;
  alert_id: number;
  confidence: number;
  sent: string;
};

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

const VolumeActivityChart = ({ data }: { data: any[] }) => {
  const maxVolume = Math.max(...data.map((d) => d.volume));
  const maxPrice = Math.max(...data.map((d) => Math.max(d.high, d.open, d.close)));
  const minPrice = Math.min(...data.map((d) => Math.min(d.low, d.open, d.close)));
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
          const color = isGreen ? "#10b981" : "#ef4444";

          const highY = getY(item.high);
          const lowY = getY(item.low);
          const openY = getY(item.open);
          const closeY = getY(item.close);
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.abs(closeY - openY) || 1;

          return (
            <g key={i}>
              <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1.5" />
              <rect x={x - 8} y={bodyTop} width="16" height={bodyHeight} fill={color} opacity="0.8" />
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

        <text x="5" y="15" fill="#94a3b8" fontSize="10">
          ${maxPrice.toFixed(0)}
        </text>
        <text x="5" y="205" fill="#94a3b8" fontSize="10">
          ${minPrice.toFixed(0)}
        </text>
      </svg>
    </div>
  );
};

const Alerts = () => {
  const userId = 1;

  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertHistoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const volumeData: any[] = [];

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAlertHistory(userId);
        if (cancelled) return;
        const arr = Array.isArray(data) ? (data as AlertHistoryItem[]) : [];
        setAlerts(arr);
        setSelectedAlert(arr[0] ?? null);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load alerts");
        setAlerts([]);
        setSelectedAlert(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
                    <TableHead className="text-muted-foreground font-semibold">Alert ID</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Confidence</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => {
                    const label = confidenceLabel(alert.confidence);
                    return (
                      <TableRow
                        key={alert.id}
                        className={`hover:bg-accent/50 transition-colors border-border cursor-pointer ${
                          selectedAlert?.id === alert.id ? "bg-accent/30" : ""
                        }`}
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <TableCell className="font-medium text-muted-foreground">
                          {timeFromIso(alert.sent)}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground">{alert.alert_id}</span>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {!loading && alerts.length === 0 && !error ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground py-6 text-center">
                        No alerts yet.
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {error ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-red-500 py-6 text-center">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : null}
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
                  <CardTitle className="text-lg font-semibold text-foreground">Alert Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Alert ID:</span>
                      <div className="mt-1 text-lg font-semibold text-foreground">{selectedAlert.alert_id}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Time:</span>
                      <div className="mt-1 text-lg font-semibold text-foreground">{timeFromIso(selectedAlert.sent)}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Confidence:</span>
                      <div className="mt-1">
                        {(() => {
                          const label = confidenceLabel(selectedAlert.confidence);
                          return (
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
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="border-b border-border bg-card">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg font-semibold text-foreground">Volume Activity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {volumeData.length ? (
                    <VolumeActivityChart data={volumeData} />
                  ) : (
                    <div className="text-sm text-muted-foreground">No volume data available.</div>
                  )}
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