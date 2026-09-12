import { useEffect, useRef, memo } from 'react';

const MARKETS = [
  { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin (BTC)', desc: 'Leading Crypto Asset' },
  { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum (ETH)', desc: 'Smart Contract Powerhouse' },
  { symbol: 'BINANCE:SOLUSDT', name: 'Solana (SOL)', desc: 'High-Performance L1' },
  { symbol: 'OANDA:XAUUSD', name: 'Gold Spot (XAU)', desc: 'Safe Haven Commodity' }
];

function MiniSymbolWidget({ symbol }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'tradingview-widget-container';
    widgetWrapper.style.height = '100%';
    widgetWrapper.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    widgetWrapper.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      width: '100%',
      height: '100%',
      locale: 'en',
      dateRange: '1D',
      colorTheme: 'dark',
      isTransparent: true,
      autosize: true,
      largeChartUrl: '',
      chartOnly: false,
      noTimeScale: false
    });

    widgetWrapper.appendChild(script);
    containerRef.current.appendChild(widgetWrapper);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol]);

  return (
    <div className="h-[210px] w-full" ref={containerRef} />
  );
}

function MarketOverviewCards() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {MARKETS.map((market) => (
        <div
          key={market.symbol}
          className="rounded-2xl border border-dark-500/80 bg-dark-800/70 p-3.5 backdrop-blur-xl hover:border-gold-500/40 transition-all shadow-lg hover:shadow-gold-500/5 group"
        >
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-bold text-white group-hover:text-gold-400 transition-colors">
              {market.name}
            </span>
            <span className="text-[10px] uppercase font-semibold text-gray-500 bg-dark-900 px-2 py-0.5 rounded-full border border-dark-600">
              Live Feed
            </span>
          </div>
          <div className="overflow-hidden rounded-xl bg-dark-900/60 border border-dark-700 h-[210px]">
            <MiniSymbolWidget symbol={market.symbol} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(MarketOverviewCards);
