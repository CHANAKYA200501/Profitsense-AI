import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';

type Period = '1D' | '1W' | '1M' | '3M' | '1Y';

const PERIOD_MAP: Record<Period, { period: string; interval: string }> = {
  '1D': { period: '1d', interval: '5m' },
  '1W': { period: '5d', interval: '15m' },
  '1M': { period: '1mo', interval: '1d' },
  '3M': { period: '3mo', interval: '1d' },
  '1Y': { period: '1y', interval: '1wk' },
};

export const ChartPanel: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { activeSymbol } = useStore();
  const [activePeriod, setActivePeriod] = useState<Period>('1M');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current || !activeSymbol) return;

    const container = chartContainerRef.current;
    setLoading(true);

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#334155',
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: activePeriod === '1D' || activePeriod === '1W',
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    const emaSeries = chart.addSeries(LineSeries, {
      color: '#6366F1',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    const { period, interval } = PERIOD_MAP[activePeriod];

    fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/market/ohlcv?symbol=${encodeURIComponent(activeSymbol)}&period=${period}&interval=${interval}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.status === 'success' && json.data?.length > 0) {
          const candles = json.data.map((d: any) => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }));
          candlestickSeries.setData(candles);

          // Volume
          const volumes = json.data.map((d: any) => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
          }));
          volumeSeries.setData(volumes);

          // EMA-20 overlay
          const emaData: { time: any; value: number }[] = [];
          const closes = json.data.map((d: any) => d.close);
          const emaPeriod = 20;
          if (closes.length >= emaPeriod) {
            let ema = closes.slice(0, emaPeriod).reduce((a: number, b: number) => a + b, 0) / emaPeriod;
            const multiplier = 2 / (emaPeriod + 1);
            for (let i = emaPeriod - 1; i < closes.length; i++) {
              if (i === emaPeriod - 1) {
                ema = closes.slice(0, emaPeriod).reduce((a: number, b: number) => a + b, 0) / emaPeriod;
              } else {
                ema = (closes[i] - ema) * multiplier + ema;
              }
              emaData.push({ time: json.data[i].time, value: Math.round(ema * 100) / 100 });
            }
            emaSeries.setData(emaData);
          }

          chart.timeScale().fitContent();
        }
      })
      .catch((err) => console.error('Failed to fetch OHLCV:', err))
      .finally(() => setLoading(false));

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [activeSymbol, activePeriod]);

  return (
    <div className="p-8 h-full flex flex-col relative overflow-hidden bg-white border border-slate-200 shadow-sm italic">
      <div className="flex justify-between items-center mb-10 relative z-10 px-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
            {activeSymbol || 'Analysis Hub'}
          </h2>
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shadow-lg" />
             <span className="text-[10px] text-blue-600 font-black tracking-widest uppercase">Data Feed: Operational</span>
          </div>
        </div>
        
        <div className="flex gap-2 border border-slate-100 p-2 bg-slate-50 shadow-inner">
          {(Object.keys(PERIOD_MAP) as Period[]).map((t) => (
            <button
              key={t}
              onClick={() => setActivePeriod(t)}
              className={`px-4 py-1.5 text-[10px] font-black tracking-widest transition-all ${
                activePeriod === t
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-blue-600 hover:bg-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative min-h-0 bg-slate-50/30">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-md">
             <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-1 bg-slate-100 relative overflow-hidden">
                   <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-blue-600" 
                   />
                </div>
                <span className="text-[10px] text-blue-600 font-black uppercase tracking-[0.5em]">Synchronizing Market Data</span>
             </div>
          </div>
        )}
        
        {activeSymbol ? (
          <div ref={chartContainerRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-50 shadow-inner">
             <div className="flex flex-col items-center gap-4 opacity-30">
                <div className="w-12 h-12 border-2 border-slate-300 rounded-full flex items-center justify-center">
                   <div className="w-2 h-2 bg-slate-400 rounded-full" />
                </div>
                <span className="text-[10px] text-slate-900 font-black uppercase tracking-[0.5em]">Awaiting Analysis Selection</span>
             </div>
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="mt-6 flex items-center justify-between px-2 pt-6 border-t border-slate-100 italic">
         <div className="flex gap-8">
            <span className="text-[8px] text-slate-400 font-black uppercase flex items-center gap-2">
               Resolution: {activePeriod === '1D' ? '5M' : '1D'}
            </span>
            <span className="text-[8px] text-slate-400 font-black uppercase flex items-center gap-2">
               Source: NYSE/NSE Composite
            </span>
         </div>
         <span className="text-[8px] text-blue-600/30 font-black uppercase tracking-widest">Institutional Grade Telemetry</span>
      </div>
    </div>
  );
};
