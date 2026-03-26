import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgoFromUnixSeconds(unix?: number): string {
  if (!unix) return "";
  const diff = Date.now() - unix * 1000;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
 
export function formatTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
 
export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}
 
export function formatPrice(price?: number): string {
  if (price == null) return "—";
  return `$${price.toFixed(2)}`;
}
 
export function formatSize(size?: number): string {
  if (size == null) return "—";
  return size.toLocaleString();
}
 
export const delay = (ms: number) =>
  new Promise((r) => setTimeout(r, ms));
 
const EXCHANGE_MAP: Record<string, string> = {
  AAPL: "NASDAQ", MSFT: "NASDAQ", NVDA: "NASDAQ", GOOGL: "NASDAQ",
  AMZN: "NASDAQ", META: "NASDAQ", TSLA: "NASDAQ", INTC: "NASDAQ",
  AMD: "NASDAQ", NFLX: "NASDAQ", PYPL: "NASDAQ", CSCO: "NASDAQ",
  JPM: "NYSE", GS: "NYSE", BAC: "NYSE", WMT: "NYSE",
  XOM: "NYSE", V: "NYSE", MA: "NYSE", DIS: "NYSE",
};
 
export function inferExchange(symbol: string): string {
  return EXCHANGE_MAP[symbol.toUpperCase()] ?? "NASDAQ";
}