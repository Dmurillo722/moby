export type SignalTimeframeMethod = {
  warmed_up?: boolean;
  signals_suppressed?: boolean;
  // volume_impact fields
  rolling_volume?: number;
  impact_ratio?: number;
  avg_bar_volume?: number;
  volume_z_score?: number;
  impact_classification?: "Extreme" | "Significant" | "Minor" | "Normal";
  // ofi fields
  net_ofi?: number;
  normalized_ofi?: number;
  buy_volume?: number;
  sell_volume?: number;
  buy_ratio?: number;
};

export type SignalTimeframe = {
  window_minutes: number;
  methods: {
    volume_impact?: SignalTimeframeMethod;
    ofi?: SignalTimeframeMethod;
  };
};

export type SignalConvergence = {
  signal_strength: "strong" | "moderate" | "weak" | "none";
  volume_agreement: boolean;
  ofi_agreement: boolean;
  ofi_direction: "buy" | "sell" | null;
};

export type DetectionSignal = {
  symbol: string;
  bar: {
    t: string;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw?: number;
  };
  timeframes: Record<string, SignalTimeframe>;
  convergence: SignalConvergence;
};

const BASE = "http://localhost:8000";

export async function getRecentSignals(
  token: string,
  limit = 50,
): Promise<DetectionSignal[]> {
  const response = await fetch(`${BASE}/signals/recent?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}