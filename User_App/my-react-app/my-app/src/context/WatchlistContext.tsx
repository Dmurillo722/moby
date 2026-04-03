import React, { createContext, useContext, useState, useEffect } from "react";
import type { WatchedSymbol } from "@/lib/types";
import { inferExchange } from "@/lib/utils";

type WatchlistContextType = {
  symbols: WatchedSymbol[];
  addSymbol: (symbol: string) => { error?: string };
  removeSymbol: (symbol: string) => void;
};

const WatchlistContext = createContext<WatchlistContextType | null>(null);

const STORAGE_KEY = "moby:watchlist";

const DEFAULT_SYMBOLS: WatchedSymbol[] = [
  { symbol: "AAPL", exchange: "NASDAQ" },
];

export const WatchlistProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [symbols, setSymbols] = useState<WatchedSymbol[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as WatchedSymbol[];
    } catch {
    }
    return DEFAULT_SYMBOLS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
    } catch {
    }
  }, [symbols]);

  const addSymbol = (raw: string): { error?: string } => {
    const symbol = raw.trim().toUpperCase();
    if (!symbol) return { error: "Enter a symbol" };
    if (symbols.find((s) => s.symbol === symbol))
      return { error: `${symbol} is already in your watchlist` };
    setSymbols((prev) => [
      ...prev,
      { symbol, exchange: inferExchange(symbol) },
    ]);
    return {};
  };

  const removeSymbol = (symbol: string) => {
    setSymbols((prev) => prev.filter((s) => s.symbol !== symbol));
  };

  return (
    <WatchlistContext.Provider value={{ symbols, addSymbol, removeSymbol }}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = (): WatchlistContextType => {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used inside WatchlistProvider");
  return ctx;
};