import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  RefreshCw,
  Zap,
  Target
} from 'lucide-react';

interface IntradayStats {
  day_open: number;
  day_high: number;
  day_low: number;
  ltp: number;
  total_volume: number;
  change_pct: number;
}

const QUICK_ACCESS_VECTORS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT',
  'AXISBANK', 'WIPRO', 'NIFTY 50', 'SENSEX',
];

export const IntradayView: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState('RELIANCE');
  const [searchInput, setSearchInput] = useState('');
  const [stats, setStats] = useState<IntradayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<'1m' | '5m' | '15m'>('5m');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const chartInstance = useRef<any>(null);

  const fetchAndRender = useCallback((sym: string, intv: string) => {
    setLoading(true);
    setError(null);

    fetch(`http://localhost:8000/api/market/intraday?symbol=${encodeURIComponent(sym)}&interval=${intv}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.status !== 'success') {
          setError(json.error || 'Connection to market data stream failed');
          return;
        }

        setStats(json.stats);
        setLastRefresh(new Date());

        if (!chartRef.current) return;

        if (chartInstance.current) {
          try {
            chartInstance.current.remove();
          } catch (err) {}
          chartInstance.current = null;
        }

        const chart = createChart(chartRef.current, {
          autoSize: true,
          layout: {
            background: { type: ColorType.Solid, color: '#ffffff' },
            textColor: '#64748b',
            fontFamily: 'Inter, sans-serif',
          },
          grid: {
            vertLines: { color: '#f1f5f9' },
            horzLines: { color: '#f1f5f9' },
          },
          crosshair: { mode: CrosshairMode.Normal },
          rightPriceScale: { borderColor: '#e2e8f0' },
          timeScale: { borderColor: '#e2e8f0', timeVisible: true, secondsVisible: false },
        });
        chartInstance.current = chart;

        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ff0000',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ff0000',
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

        const candles = json.data.map((d: any) => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));
        candleSeries.setData(candles);

        const volumes = json.data.map((d: any) => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(34,197,94,0.1)' : 'rgba(255,0,0,0.1)',
        }));
        volumeSeries.setData(volumes);

        chart.timeScale().fitContent();
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setError('Network connection interrupted');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAndRender(symbol, interval);
    const timer = window.setInterval(() => fetchAndRender(symbol, interval), 30000);
    return () => {
      window.clearInterval(timer);
      if (chartInstance.current) {
        try {
          chartInstance.current.remove();
        } catch (err) {}
        chartInstance.current = null;
      }
    };
  }, [symbol, interval, fetchAndRender]);

  const handleSearch = () => {
    const s = searchInput.trim().toUpperCase();
    if (s) {
      setSymbol(s);
      setSearchInput('');
    }
  };

  const isPositive = (stats?.change_pct ?? 0) >= 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#f8fafc] font-sans relative">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-10 py-6 flex items-center justify-between shrink-0 z-20 relative">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center shadow-sm">
               <Zap size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Intraday Analysis</h2>
          </div>

          <div className="h-10 w-px bg-slate-100 mx-4" />

          {/* Search */}
          <div className="relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Search Ticker..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-12 pr-24 py-3 bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition-all w-80 italic"
            />
            <button
              onClick={handleSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm"
            >
              Search
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            {(['1m', '5m', '15m'] as const).map((intv) => (
              <button
                key={intv}
                onClick={() => setInterval(intv)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all border ${
                  interval === intv
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white border-slate-100 text-slate-400 hover:border-blue-600 hover:text-blue-600'
                }`}
              >
                {intv}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAndRender(symbol, interval)}
            className="p-2.5 bg-white border border-slate-200 hover:border-blue-600 text-blue-600 transition-all shadow-sm group"
          >
            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>

          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold italic border-l border-slate-100 pl-6">
            <Clock size={12} className="text-blue-600" />
            {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="bg-slate-50 border-b border-slate-200 px-10 py-3 flex items-center gap-3 overflow-x-auto shrink-0 z-20 relative no-scrollbar">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic mr-4 shrink-0">Trending Symbols:</span>
        {QUICK_ACCESS_VECTORS.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
              symbol === s
                ? 'bg-blue-50 text-blue-600 border-blue-600 shadow-sm'
                : 'bg-white border-slate-100 text-slate-500 hover:border-blue-600 hover:text-blue-600'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 relative z-10">
        <div className="flex-1 flex flex-col p-10 min-w-0 space-y-8 overflow-y-auto custom-scrollbar">
          {/* Market Snapshot */}
          {stats && (
              <div
                className="flex flex-wrap items-center gap-8 bg-white p-8 border border-slate-200 shadow-sm relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-blue-600 transition-all" />
                <div className="mr-8">
                  <div className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase mb-3">{symbol}</div>
                  <div className={`text-xs font-bold flex items-center gap-3 italic uppercase tracking-widest ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {isPositive ? 'Gain' : 'Loss'} {isPositive ? '+' : ''}{stats.change_pct ?? 0}%
                  </div>
                </div>

                <div className="h-16 w-px bg-slate-100" />

                <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-10">
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest italic flex items-center gap-2">Day Open</div>
                    <div className="text-lg font-sans text-slate-900 font-black italic">₹{stats.day_open != null ? stats.day_open.toLocaleString('en-IN') : '—'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] text-green-600 opacity-60 uppercase font-bold tracking-widest italic flex items-center gap-2">Day High</div>
                    <div className="text-lg font-sans text-green-600 font-black italic">₹{stats.day_high != null ? stats.day_high.toLocaleString('en-IN') : '—'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] text-red-600 opacity-60 uppercase font-bold tracking-widest italic flex items-center gap-2">Day Low</div>
                    <div className="text-lg font-sans text-red-600 font-black italic">₹{stats.day_low != null ? stats.day_low.toLocaleString('en-IN') : '—'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest italic flex items-center gap-2">Last Price</div>
                    <div className="text-lg font-sans text-slate-900 font-black italic">₹{stats.ltp != null ? stats.ltp.toLocaleString('en-IN') : '—'}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest italic flex items-center gap-2"><BarChart3 size={12} className="text-blue-600" /> Vol (M)</div>
                    <div className="text-lg font-sans text-slate-400 font-black italic">
                      {stats.total_volume ? (stats.total_volume / 1e6).toFixed(2) : '--'}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Chart Console */}
          <div className="flex-1 bg-white border border-slate-200 p-6 relative min-h-[500px] shadow-sm overflow-hidden group">
            <div className="absolute top-0 right-0 w-1 h-full bg-slate-100 group-hover:bg-blue-600 transition-all" />
            <AnimatePresence>
              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 p-20"
                >
                  <div className="w-16 h-16 border-t-2 border-blue-600 animate-spin mb-8" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Syncing Market Data...</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            {error ? (
              <div className="flex-1 h-full flex flex-col items-center justify-center text-red-600 p-20 space-y-8">
                <Target size={48} className="opacity-20" />
                <div className="text-center">
                  <h3 className="text-xl font-black uppercase tracking-widest mb-4 italic">Connection Failed</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">{error}</p>
                </div>
              </div>
            ) : (
              <div ref={chartRef} className="w-full h-full" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
