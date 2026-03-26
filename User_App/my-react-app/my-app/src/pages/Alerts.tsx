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
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import {
  getAlertHistory,
  type AlertHistoryItem,
} from "@/endpoint_connections/alerts_endpoint";

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function formatPrice(price?: number) {
  if (price == null) return "—";
  return `$${price.toFixed(2)}`;
}

function formatSize(size?: number) {
  if (size == null) return "—";
  return size.toLocaleString();
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </dt>
      <dd className="text-sm font-semibold text-foreground font-mono">
        {value ?? "—"}
      </dd>
    </div>
  );
}

const Alerts = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([]);
  const [selected, setSelected] = useState<AlertHistoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAlertHistory(userId);
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        setAlerts(arr);
        setSelected(arr[0] ?? null);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load alerts");
        setAlerts([]);
        setSelected(null);
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Alerts
        </h1>
        {loading && (
          <p className="text-sm text-muted-foreground mt-1">Loading…</p>
        )}
        {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                    <TableHead className="text-muted-foreground font-semibold">
                      Time
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Symbol
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right">
                      Price
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-right">
                      Size
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow
                      key={alert.id}
                      onClick={() => setSelected(alert)}
                      className={`hover:bg-accent/50 transition-colors border-border cursor-pointer ${
                        selected?.id === alert.id ? "bg-accent/30" : ""
                      }`}
                    >
                      <TableCell className="text-muted-foreground">
                        <div className="font-medium text-sm">
                          {formatTime(alert.sent)}
                        </div>
                        <div className="text-xs text-muted-foreground/60">
                          {formatDate(alert.sent)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="font-bold text-foreground font-mono">
                          {alert.symbol ?? "—"}
                        </span>
                      </TableCell>

                      <TableCell className="text-right font-mono text-foreground text-sm">
                        {formatPrice(alert.price)}
                      </TableCell>

                      <TableCell className="text-right font-mono text-foreground text-sm">
                        {formatSize(alert.size)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {!loading && alerts.length === 0 && !error && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-sm text-muted-foreground py-8 text-center"
                      >
                        No alerts yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <Card className="border-border">
              <CardHeader className="border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Trade Detail
                    </CardTitle>
                  </div>
                  {selected.symbol && (
                    <Badge
                      variant="outline"
                      className="font-mono text-base px-3"
                    >
                      {selected.symbol}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Price
                    </dt>
                    <dd className="text-3xl font-bold font-mono text-foreground">
                      {formatPrice(selected.price)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Trade size
                    </dt>
                    <dd className="text-3xl font-bold font-mono text-foreground">
                      {formatSize(selected.size)}
                    </dd>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <DetailField
                    label="Trade timestamp"
                    value={
                      selected.trade_timestamp
                        ? `${formatDate(selected.trade_timestamp)} ${formatTime(selected.trade_timestamp)}`
                        : undefined
                    }
                  />
                  <DetailField
                    label="Alert detected"
                    value={`${formatDate(selected.sent)} ${formatTime(selected.sent)}`}
                  />
                  <DetailField label="Exchange" value={selected.exchange} />
                  <DetailField label="Tape" value={selected.tape} />
                  <DetailField
                    label="Trade ID"
                    value={selected.trade_id?.toString()}
                  />
                  <DetailField
                    label="Alert ID"
                    value={`#${selected.alert_id}`}
                  />
                  <div className="col-span-2">
                    <DetailField
                      label="Conditions"
                      value={
                        selected.conditions ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selected.conditions.split(",").map((c) => (
                              <Badge
                                key={c}
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {c.trim()}
                              </Badge>
                            ))}
                          </div>
                        ) : undefined
                      }
                    />
                  </div>
                </dl>
              </CardContent>
            </Card>
          ) : (
            !loading && (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Select an alert to view details.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Alerts;
