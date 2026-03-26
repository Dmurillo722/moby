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

export type AlertConfig = {
  id: number;
  user_id: number;
  asset_id: number;
  asset_symbol: string;
  alert_type: string;
  threshold: number | null;
  email: boolean;
  sms: boolean;
};

export type CreateAlertPayload = {
  user_id: number;
  asset_symbol: string;
  alert_type: string;
  threshold: number;
  email: boolean;
  sms: boolean;
};

const BASE = "http://localhost:8000";

export async function getAlertHistory(
  userId: number,
  limit = 20,
): Promise<AlertHistoryItem[]> {
  const response = await fetch(
    `${BASE}/alerts/alert_history?user_id=${userId}&limit=${limit}`,
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function listAlerts(userId: number): Promise<AlertConfig[]> {
  const response = await fetch(`${BASE}/alerts/list?user_id=${userId}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function createAlert(payload: CreateAlertPayload): Promise<AlertConfig> {
  const response = await fetch(`${BASE}/alerts/create_alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function deleteAlert(alertId: number): Promise<void> {
  const response = await fetch(`${BASE}/alerts/delete_alert/${alertId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await response.text());
}