export async function getAlertHistory(userId: number) {
  const response = await fetch(`http://localhost:8000/alerts/alert_history?user_id=${userId}`);
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}

export async function deleteAlert(alertId: number) {
  const response = await fetch(`http://localhost:8000/alerts/delete_alert/${alertId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await response.text());
  // backend returns 204 -> no body
  return;
}

export async function createAlert(payload: {
  user_id: number;
  asset_symbol: string;
  alert_type: string;
  threshold: number;
  email: boolean;
  sms: boolean;
}) {
  const response = await fetch(`http://localhost:8000/alerts/create_alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}