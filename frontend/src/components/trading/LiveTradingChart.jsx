import { useState, useEffect, useRef, memo } from 'react';
import { Activity, BarChart2, Cpu } from 'lucide-react';

const TRADING_PAIRS = [
  { symbol: 'BINANCE:BTCUSDT', label: 'BTC / USDT', name: 'Bitcoin', icon: '₿', category: 'Crypto' },
  { symbol: 'BINANCE:ETHUSDT', label: 'ETH / USDT', name: 'Ethereum', icon: 'Ξ', category: 'Crypto' },
  { symbol: 'BINANCE:SOLUSDT', label: 'SOL / USDT', name: 'Solana', icon: '◎', category: 'Crypto' },
  { symbol: 'BINANCE:BNBUSDT', label: 'BNB / USDT', name: 'BNB Chain', icon: '🟡', category: 'Crypto' },
  { symbol: 'OANDA:XAUUSD', label: 'XAU / USD', name: 'Gold Spot', icon: '🏆', category: 'Commodities' },
  { symbol: 'FX:EURUSD', label: 'EUR / USD', name: 'Euro / Dollar', icon: '💶', category: 'Forex' },
];

function LiveTradingChart() {
  const [selectedPair, setSelectedPair] = useState(TRADING_PAIRS[0]);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'technical'
  const containerRef = useRef(null);

  // Load TradingView Widget whenever selected pair or active tab changes
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
    script.type = 'text/javascript';
    script.async = true;

    if (activeTab === 'chart') {
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: selectedPair.symbol,
        interval: '60',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        allow_symbol_change: true,
        calendar: false,
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        hide_legend: false,
        save_image: false,
        backgroundColor: '#0a0a0f',
        gridColor: 'rgba(255, 255, 255, 0.05)',
        support_host: 'https://www.tradingview.com'
      });
    } else {
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
      script.innerHTML = JSON.stringify({
        interval: '1h',
        width: '100%',
        isTransparent: true,
        height: '100%',
        symbol: selectedPair.symbol,
        showIntervalTabs: true,
        displayMode: 'single',
        locale: 'en',
        colorTheme: 'dark'
      });
    }

    widgetWrapper.appendChild(script);
    containerRef.current.appendChild(widgetWrapper);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [selectedPair, activeTab]);

  return (
    <div className="rounded-3xl border border-dark-500/80 bg-dark-900/90 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Chart Control Header */}
      <div className="p-4 sm:p-5 border-b border-dark-600/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-800/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold-400/10 border border-gold-400/30 text-gold-400 text-xs font-bold mr-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIVE EXECUTION
          </div>

          {/* Quick Pair Selector Pills */}
          <div className="flex flex-wrap gap-1.5">
            {TRADING_PAIRS.map((pair) => {
              const isSelected = selectedPair.symbol === pair.symbol;
              return (
                <button
                  key={pair.symbol}
                  onClick={() => setSelectedPair(pair)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 font-bold shadow-md shadow-gold-500/20'
                      : 'bg-dark-750 text-gray-300 hover:text-white hover:bg-dark-700 border border-dark-600'
                  }`}
                >
                  <span>{pair.icon}</span>
                  <span>{pair.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Toggle (Candles vs Technical Summary) */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="bg-dark-950 p-1 rounded-xl border border-dark-600 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'chart'
                  ? 'bg-dark-700 text-gold-400 shadow-sm border border-gold-400/20 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <BarChart2 size={14} />
              Live Candles
            </button>
            <button
              onClick={() => setActiveTab('technical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'technical'
                  ? 'bg-dark-700 text-gold-400 shadow-sm border border-gold-400/20 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Activity size={14} />
              AI Indicators
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Area with fixed explicit height filling 100% */}
      <div className="relative w-full h-[560px] sm:h-[620px] bg-[#0a0a0f] overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Footer Info Strip */}
      <div className="p-4 bg-dark-900/95 border-t border-dark-600/80 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Asset:</span>
            <span className="text-white font-semibold">{selectedPair.name} ({selectedPair.label})</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-gray-500">Feed:</span>
            <span className="text-emerald-400 font-mono">Institutional Zero-Delay WebSocket</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-dark-800 border border-dark-600 text-[11px] text-gray-300">
            <Cpu size={12} className="text-gold-400" /> Solvex Alpha Router V2
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(LiveTradingChart);
