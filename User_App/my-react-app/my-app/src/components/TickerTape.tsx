import { useEffect, useRef } from "react";

const TICKER_SYMBOLS = [
  { proName: "NASDAQ:AAPL", title: "Apple" },
  { proName: "NASDAQ:MSFT", title: "Microsoft" },
  { proName: "NASDAQ:NVDA", title: "NVIDIA" },
  { proName: "NASDAQ:GOOGL", title: "Alphabet" },
  { proName: "NASDAQ:AMZN", title: "Amazon" },
  { proName: "NASDAQ:META", title: "Meta" },
  { proName: "NASDAQ:TSLA", title: "Tesla" },
  { proName: "NYSE:JPM", title: "JPMorgan" },
  { proName: "NYSE:GS", title: "Goldman" },
  { proName: "BINANCE:BTCUSDT", title: "Bitcoin" },
  { proName: "BINANCE:ETHUSDT", title: "Ethereum" },
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
];

const TickerTape = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: TICKER_SYMBOLS,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "en",
    });

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container -mx-6 mb-2" ref={containerRef}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
};

export default TickerTape;