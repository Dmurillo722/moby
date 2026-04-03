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
  token: string,
  limit = 20,
): Promise<AlertHistoryItem[]> {
  console.log("TOKEN BEING SENT:", token);
  const response = await fetch(`${BASE}/alerts/alert_history?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function listAlerts(token: string): Promise<AlertConfig[]> {
  const response = await fetch(`${BASE}/alerts/list`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function createAlert(
  payload: CreateAlertPayload,
  token: string,
): Promise<AlertConfig> {
  const response = await fetch(`${BASE}/alerts/create_alert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function deleteAlert(
  alertId: number,
  token: string,
): Promise<void> {
  const response = await fetch(`${BASE}/alerts/delete_alert/${alertId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error(await response.text());
}
