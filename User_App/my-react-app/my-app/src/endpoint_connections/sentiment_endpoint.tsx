export async function getInsiderSentiment(symbol: string) {
  const response = await fetch(`http://localhost:8000/insider/${symbol}`);
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}