export async function getStockNews(symbol: string) {
  const response = await fetch(`http://localhost:8000/news/${symbol}`);
  return await response.json();
}

export async function getMarketNews(category = "general") {
  const response = await fetch(
    `http://localhost:8000/news/market/${category}`
  );
  if (!response.ok) throw new Error(await response.text());
  return await response.json();
}