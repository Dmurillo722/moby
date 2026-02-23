export async function getStockNews(symbol: string) {
  const response = await fetch(`http://localhost:8000/news/${symbol}`);
  return await response.json();
}
