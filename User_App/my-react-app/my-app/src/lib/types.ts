export type WatchedSymbol = {
  symbol: string;
  exchange: string;
};

export type AlertHistoryItem = {
  id: number;
  alert_id: number;
  sent: string;
  symbol?: string;
  price?: number;
  size?: number;
  exchange?: string;
  trade_id?: number;
  conditions?: string;
  tape?: string;
  trade_timestamp?: string;
};

export type MarketNewsItem = {
  headline?: string;
  source?: string;
  url?: string;
  datetime?: number;
  summary?: string;
};

export type CompanyNewsItem = {
  headline?: string;
  source?: string;
  url?: string;
  datetime?: number;
  summary?: string;
};

export type InsiderSentimentResponse = {
  symbol?: string;
  data?: Array<{
    month?: string;
    mspr?: number;
    change?: number;
  }>;
};

export type AlertTypeName = "size" | "volume";

export type AlertTypeOption = {
  value: AlertTypeName;
  label: string;
  description: string;
  available: boolean; 
};

export const ALERT_TYPE_OPTIONS: AlertTypeOption[] = [
  {
    value: "size",
    label: "Trade Size",
    description: "Triggers when a single trade exceeds a share count threshold",
    available: true,
  },
  {
    value: "volume",
    label: "Volume Spike",
    description: "Triggers when volume exceeds a threshold (coming soon)",
    available: false,
  },
];