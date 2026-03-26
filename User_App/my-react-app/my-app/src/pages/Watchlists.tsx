import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { X, Plus, Bell, Trash2 } from "lucide-react";
import MiniChart from "@/components/MiniChart";
import { useWatchlist } from "@/context/WatchlistContext";
import {
  createAlert,
  listAlerts,
  deleteAlert,
} from "@/endpoint_connections/alerts_endpoint";
import type { AlertConfig } from "@/endpoint_connections/alerts_endpoint";
import { ALERT_TYPE_OPTIONS } from "@/lib/types";
import type { AlertTypeName } from "@/lib/types";

const CreateAlertModal = ({
  symbol,
  onClose,
  onCreated,
}: {
  symbol: string;
  onClose: () => void;
  onCreated: () => void;
}) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [alertType, setAlertType] = useState<AlertTypeName>("size");
  const [threshold, setThreshold] = useState("");
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async () => {
    const thr = Number(threshold);
    if (!Number.isFinite(thr) || thr <= 0) {
      setError("Enter a valid threshold");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await createAlert({
        user_id: userId!,
        asset_symbol: symbol,
        alert_type: alertType,
        threshold: thr,
        email,
        sms,
      });
      setSuccess(true);
      onCreated();
      setTimeout(onClose, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-border"
        style={{ backgroundColor: "hsl(222.2, 84%, 4.3%)" }}
      >
        <div className="border-b border-border py-3 px-4 flex flex-row items-center justify-between">
          <span className="text-base font-semibold text-foreground">
            New alert — <span className="font-mono">{symbol}</span>
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {success ? (
            <p className="text-sm text-emerald-500 text-center py-2">
              Alert created!
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Alert type</div>
                <div className="space-y-2">
                  {ALERT_TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                        !opt.available
                          ? "opacity-40 cursor-not-allowed border-border"
                          : alertType === opt.value
                            ? "border-primary bg-accent/30"
                            : "border-border hover:bg-accent/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="alertType"
                        value={opt.value}
                        checked={alertType === opt.value}
                        disabled={!opt.available}
                        onChange={() => setAlertType(opt.value)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium text-foreground flex items-center gap-2">
                          {opt.label}
                          {!opt.available && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1.5 py-0"
                            >
                              Soon
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {opt.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  Threshold (shares)
                </div>
                <input
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm"
                  placeholder="e.g. 500"
                  type="number"
                  min="1"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={email}
                    onChange={(e) => setEmail(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sms}
                    onChange={(e) => setSms(e.target.checked)}
                    className="h-4 w-4"
                  />
                  SMS
                </label>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <Button
                onClick={onSubmit}
                disabled={loading}
                className="w-full"
                variant="secondary"
              >
                {loading ? "Creating…" : "Create Alert"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SymbolCard = ({
  symbol,
  exchange,
  allAlerts,
  onOpenAlertModal,
  onRemoveSymbol,
  onDeleteAlert,
}: {
  symbol: string;
  exchange: string;
  allAlerts: AlertConfig[];
  onOpenAlertModal: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
  onDeleteAlert: (id: number) => void;
}) => {
  const symbolAlerts = allAlerts.filter((a) => a.asset_symbol === symbol);

  return (
    <Card className="border-border overflow-hidden">
      <CardHeader className="border-b border-border bg-card py-3 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold font-mono text-foreground">{symbol}</span>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {exchange}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenAlertModal(symbol)}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Create alert"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRemoveSymbol(symbol)}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Remove symbol"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <MiniChart symbol={symbol} exchange={exchange} />

        {symbolAlerts.length > 0 && (
          <div className="border-t border-border px-4 py-3 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Active Alerts
            </div>
            {symbolAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/30 border border-border"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs font-mono px-1.5">
                    {alert.alert_type}
                  </Badge>
                  <span className="text-foreground font-mono">
                    &gt; {alert.threshold?.toLocaleString() ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[alert.email && "Email", alert.sms && "SMS"]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteAlert(alert.id)}
                  className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Delete alert"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Watchlists = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const { symbols, addSymbol, removeSymbol } = useWatchlist();
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [alertTarget, setAlertTarget] = useState<string | null>(null);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await listAlerts(userId);
      setAlertConfigs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[alerts] failed to load alert configs", e);
    }
  }, [userId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDeleteAlert = async (id: number) => {
    try {
      await deleteAlert(id);
      setAlertConfigs((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error("[alerts] failed to delete alert", e);
    }
  };

  const handleAdd = () => {
    const { error } = addSymbol(input);
    if (error) {
      setInputError(error);
    } else {
      setInput("");
      setInputError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <div className="space-y-6">
      {alertTarget && (
        <CreateAlertModal
          symbol={alertTarget}
          onClose={() => setAlertTarget(null)}
          onCreated={fetchAlerts}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Watchlists
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {symbols.length} symbol{symbols.length !== 1 ? "s" : ""} tracked
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setInputError(null);
            }}
            onKeyDown={handleKeyDown}
            className="w-28 rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm uppercase placeholder:normal-case"
            placeholder="Symbol"
          />
          <Button onClick={handleAdd} variant="secondary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {inputError && <p className="text-sm text-red-500 -mt-4">{inputError}</p>}

      {symbols.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          Add a symbol above to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {symbols.map(({ symbol, exchange }) => (
            <SymbolCard
              key={symbol}
              symbol={symbol}
              exchange={exchange}
              allAlerts={alertConfigs}
              onOpenAlertModal={setAlertTarget}
              onRemoveSymbol={removeSymbol}
              onDeleteAlert={handleDeleteAlert}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Watchlists;
