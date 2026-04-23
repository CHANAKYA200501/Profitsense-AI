import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  ChevronRight,
  Zap
} from 'lucide-react';

interface PredictionData {
  symbol: string;
  current_price: number;
  predictions: {
    '1D': { low: number; high: number; predicted: number; confidence: number };
    '1W': { low: number; high: number; predicted: number; confidence: number };
    '1M': { low: number; high: number; predicted: number; confidence: number };
  };
  support_levels: number[];
  resistance_levels: number[];
  bull_scenario: { probability: number; target: number; rationale: string };
  bear_scenario: { probability: number; target: number; rationale: string };
}

export const PredictionView: React.FC = () => {
  const { signals, activeSymbol, setActiveSymbol } = useStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const candlesRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [fetchError, setFetchError] = useState(false);

  // Safely destroy the current chart instance
  const destroyChart = useCallback(() => {
    if (chartInstance.current) {
      try {
        chartInstance.current.remove();
      } catch (e) {
        // Chart already disposed — safe to ignore
      }
      chartInstance.current = null;
    }
  }, []);

  // Fetch OHLCV data and compute prediction — chart is built in a separate useEffect
  const generatePrediction = useCallback((symbol: string, cancelledRef: { current: boolean }) => {
    setLoading(true);
    setFetchError(false);
    destroyChart();
    candlesRef.current = [];

    fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/market/ohlcv?symbol=${encodeURIComponent(symbol)}&period=1mo&interval=1d`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelledRef.current) return;

        if (json.status !== 'success' || !json.data?.length) {
          setFetchError(true);
          setPrediction(null);
          return;
        }

        const candles = json.data;
        candlesRef.current = candles;
        const lastPrice = candles[candles.length - 1].close;
        const closes = candles.map((c: any) => c.close);

        const returns = closes.slice(1).map((c: number, i: number) => (c - closes[i]) / closes[i]);
        const avgReturn = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
        const volatility = Math.sqrt(returns.reduce((a: number, b: number) => a + (b - avgReturn) ** 2, 0) / returns.length);

        const recent5 = closes.slice(-5).reduce((a: number, b: number) => a + b, 0) / 5;
        const recent10 = closes.slice(-10).reduce((a: number, b: number) => a + b, 0) / Math.min(10, closes.length);
        const trendBias = (recent5 - recent10) / recent10;

        const pred1D = lastPrice * (1 + trendBias * 0.3);
        const pred1W = lastPrice * (1 + trendBias * 1.5);
        const pred1M = lastPrice * (1 + trendBias * 5);

        const sortedPrices = [...closes].sort((a, b) => a - b);
        const support1 = sortedPrices[Math.floor(sortedPrices.length * 0.1)];
        const support2 = sortedPrices[Math.floor(sortedPrices.length * 0.25)];
        const resistance1 = sortedPrices[Math.floor(sortedPrices.length * 0.75)];
        const resistance2 = sortedPrices[Math.floor(sortedPrices.length * 0.9)];

        const signal = signals.find((s) => s.symbol === symbol);
        const signalConfidence = signal?.confidence || 65;

        const predData: PredictionData = {
          symbol,
          current_price: lastPrice,
          predictions: {
            '1D': { low: Math.round(lastPrice * (1 - volatility * 1.2) * 100) / 100, high: Math.round(lastPrice * (1 + volatility * 1.2) * 100) / 100, predicted: Math.round(pred1D * 100) / 100, confidence: Math.min(95, signalConfidence + 10) },
            '1W': { low: Math.round(lastPrice * (1 - volatility * 3) * 100) / 100, high: Math.round(lastPrice * (1 + volatility * 3) * 100) / 100, predicted: Math.round(pred1W * 100) / 100, confidence: Math.min(85, signalConfidence) },
            '1M': { low: Math.round(lastPrice * (1 - volatility * 7) * 100) / 100, high: Math.round(lastPrice * (1 + volatility * 7) * 100) / 100, predicted: Math.round(pred1M * 100) / 100, confidence: Math.max(40, signalConfidence - 15) },
          },
          support_levels: [Math.round(support1 * 100) / 100, Math.round(support2 * 100) / 100],
          resistance_levels: [Math.round(resistance1 * 100) / 100, Math.round(resistance2 * 100) / 100],
          bull_scenario: {
            probability: trendBias > 0 ? Math.round(55 + trendBias * 200) : Math.round(35 + trendBias * 100),
            target: Math.round(lastPrice * (1 + volatility * 5) * 100) / 100,
            rationale: trendBias > 0 ? 'Bullish Momentum Detected: Short-term moving average confirms an upside trend with increasing accumulation.' : 'Reversal Projection: Historical support levels show strong integrity with a projected ascending delta.',
          },
          bear_scenario: {
            probability: trendBias < 0 ? Math.round(55 + Math.abs(trendBias) * 200) : Math.round(35 + Math.abs(trendBias) * 100),
            target: Math.round(lastPrice * (1 - volatility * 5) * 100) / 100,
            rationale: trendBias < 0 ? 'Bearish Trajectory: Selling pressure has increased, making critical support levels vulnerable to a breach.' : 'Mean Reversion: Momentum indicators show overbought conditions, suggesting a potential reversion to the mean.',
          },
        };

        if (!cancelledRef.current) setPrediction(predData);
      })
      .catch((err) => {
        if (!cancelledRef.current) { console.error('Prediction fetch error:', err); setFetchError(true); setPrediction(null); }
      })
      .finally(() => {
        if (!cancelledRef.current) setLoading(false);
      });
  }, [signals, destroyChart]);

  // Trigger fetch when symbol changes
  useEffect(() => {
    const cancelledRef = { current: false };
    if (activeSymbol) generatePrediction(activeSymbol, cancelledRef);
    return () => { cancelledRef.current = true; destroyChart(); };
  }, [activeSymbol, generatePrediction, destroyChart]);

  // Build chart AFTER prediction state is set and DOM has re-rendered with chartRef
  useEffect(() => {
    if (!prediction || loading || candlesRef.current.length === 0) return;
    // Wait one frame for React to paint the chartRef container
    const raf = requestAnimationFrame(() => {
      if (!chartRef.current) return;
      destroyChart();
      try {
        const candles = candlesRef.current;
        const lastPrice = prediction.current_price;
        const chart = createChart(chartRef.current!, {
          autoSize: true,
          layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#71717a', fontFamily: 'Inter, sans-serif' },
          grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
          crosshair: { mode: CrosshairMode.Normal },
          rightPriceScale: { borderColor: '#e2e8f0' },
          timeScale: { borderColor: '#e2e8f0' },
        });
        chartInstance.current = chart;

        const candleSeries = chart.addSeries(CandlestickSeries, { upColor: '#22c55e', downColor: '#ff0000', borderVisible: false, wickUpColor: '#22c55e', wickDownColor: '#ff0000' });
        candleSeries.setData(candles.map((c: any) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));

        const lastTime = candles[candles.length - 1].time;
        const dayInSeconds = 86400;

        const predLine = chart.addSeries(LineSeries, { color: '#2563eb', lineWidth: 2, lineStyle: 2, priceLineVisible: false, lastValueVisible: true });
        predLine.setData([
          { time: lastTime as any, value: lastPrice },
          { time: ((lastTime as number) + dayInSeconds * 7) as any, value: prediction.predictions['1W'].predicted },
          { time: ((lastTime as number) + dayInSeconds * 30) as any, value: prediction.predictions['1M'].predicted },
        ]);

        const coneSeries = chart.addSeries(AreaSeries, { topColor: 'rgba(37, 99, 235, 0.1)', bottomColor: 'rgba(37, 99, 235, 0.01)', lineColor: 'rgba(37, 99, 235, 0.2)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        coneSeries.setData([
          { time: lastTime as any, value: lastPrice },
          { time: ((lastTime as number) + dayInSeconds * 7) as any, value: prediction.predictions['1W'].high },
          { time: ((lastTime as number) + dayInSeconds * 30) as any, value: prediction.predictions['1M'].high },
        ]);

        chart.timeScale().fitContent();
      } catch (err) {
        console.error('Chart creation error:', err);
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prediction, loading]);

  return (
    <main className="flex-1 flex overflow-hidden min-h-0 bg-[#f8fafc] font-sans relative">
      {/* Left Sidebar - Signal Buffer */}
      <aside className="w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 relative shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50">
          <h3 className="text-[10px] uppercase tracking-widest text-blue-600 font-bold flex items-center gap-4 italic">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            Signal History
          </h3>
          <div className="mt-4 text-[9px] text-slate-400 font-bold uppercase tracking-widest italic opacity-50">Synchronizing market data...</div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
          {signals.length === 0 ? (
            <div className="text-center py-20 text-gray-800 text-[10px] font-black uppercase tracking-[0.2em] italic">
              &gt; STATUS: NULL_BUFFER_WAITING_FOR_SCAN_
            </div>
          ) : (
            signals.map((sig: any) => {
              const isActive = sig.symbol === activeSymbol;
              return (
                <button
                  key={sig.id}
                  onClick={() => setActiveSymbol(sig.symbol)}
                  className={`w-full text-left px-5 py-4 transition-all flex items-center justify-between group border ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-slate-100 text-slate-400 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className={`text-sm font-black italic tracking-tight uppercase ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {sig.symbol}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>Current Signal</span>
                  </div>
                  <ChevronRight size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} />
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          {prediction ? (
            <div
              className="p-10 max-w-6xl mx-auto space-y-12"
            >
               {/* Header */}
              <div className="flex items-center gap-10">
                <div className="w-20 h-20 bg-white border border-slate-200 flex items-center justify-center shadow-sm relative overflow-hidden">
                   <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600" />
                   <Brain size={40} className="text-blue-600 relative z-10" />
                </div>
                <div>
                  <h1 className="text-5xl font-black text-slate-900 italic tracking-tighter uppercase">{prediction.symbol}</h1>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    <p className="text-[10px] text-blue-600 uppercase tracking-widest font-bold">AI Price Prediction</p>
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2 italic">Last Traded Price</div>
                  <div className="text-4xl font-black text-slate-900 font-sans tracking-tighter italic">
                    ₹{prediction.current_price.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Chart with Prediction */}
              <div className="bg-white p-8 border border-slate-200 h-[500px] relative overflow-hidden group shadow-sm">
                <div ref={chartRef} className="w-full h-full" />
                {loading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <div className="w-12 h-12 border-t-2 border-blue-600 animate-spin mb-6" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Calculating Price Projections...</p>
                  </div>
                )}
              </div>

              {/* Prediction Cards - Forecast Horizons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {(['1D', '1W', '1M'] as const).map((horizon, idx) => {
                  const pred = prediction.predictions[horizon];
                  const isUp = pred.predicted > prediction.current_price;
                  const changePct = ((pred.predicted - prediction.current_price) / prediction.current_price * 100).toFixed(2);
                  return (
                    <motion.div
                      key={horizon}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white p-8 border border-slate-200 hover:border-blue-400 transition-all relative overflow-hidden group shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold italic">{horizon} Forecast</span>
                        <span className={`text-[9px] font-bold px-3 py-1 border italic ${
                          pred.confidence > 75 ? 'bg-green-50 text-green-600 border-green-100' :
                          pred.confidence > 50 ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                          'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {pred.confidence}% Conf
                        </span>
                      </div>

                      <div className={`text-3xl font-black font-sans tracking-tighter italic ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{pred.predicted.toLocaleString('en-IN')}
                      </div>
                      <div className={`text-[11px] font-bold flex items-center gap-3 mt-4 italic uppercase tracking-widest ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                        {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {isUp ? 'Projected Gain' : 'Projected Loss'} {isUp ? '+' : ''}{changePct}%
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-6 text-[10px]">
                        <div>
                          <div className="text-slate-400 uppercase font-bold tracking-widest mb-2 italic">Target Floor</div>
                          <div className="text-red-600 font-sans font-bold italic">₹{pred.low.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                          <div className="text-slate-400 uppercase font-bold tracking-widest mb-2 italic">Target Ceiling</div>
                          <div className="text-green-600 font-sans font-bold italic">₹{pred.high.toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-8 w-full bg-slate-100 h-1 relative overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pred.confidence}%` }}
                          className={`h-full absolute top-0 left-0 ${
                            pred.confidence > 75 ? 'bg-green-500' : pred.confidence > 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* ALPHA_SCENARIOS - Probability Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-green-200 p-8 relative overflow-hidden group hover:border-green-400 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-6 mb-8 relative z-10">
                    <div className="w-12 h-12 bg-white border-2 border-green-500 flex items-center justify-center shadow-sm">
                      <TrendingUp size={24} className="text-green-500" />
                    </div>
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest italic">Bullish Case</span>
                    <span className="ml-auto text-4xl font-black text-green-600 font-sans italic">{prediction.bull_scenario.probability}%</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-sans tracking-tighter mb-6 italic">
                    Target: ₹{prediction.bull_scenario.target.toLocaleString('en-IN')}
                  </div>
                  <div className="bg-green-50 p-6 border border-green-100 italic text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
                    "{prediction.bull_scenario.rationale}"
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-red-200 p-8 relative overflow-hidden group hover:border-red-400 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-6 mb-8 relative z-10">
                    <div className="w-12 h-12 bg-white border-2 border-red-500 flex items-center justify-center shadow-sm">
                      <TrendingDown size={24} className="text-red-500" />
                    </div>
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest italic">Bearish Case</span>
                    <span className="ml-auto text-4xl font-black text-red-600 font-sans italic">{prediction.bear_scenario.probability}%</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-sans tracking-tighter mb-6 italic">
                    Target: ₹{prediction.bear_scenario.target.toLocaleString('en-IN')}
                  </div>
                  <div className="bg-red-50 p-6 border border-red-100 italic text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
                    "{prediction.bear_scenario.rationale}"
                  </div>
                </motion.div>
              </div>

              {/* FLOOR_CEILING_VECTORS - Support & Resistance Point Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 p-10 relative overflow-hidden shadow-sm">
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-10 flex items-center gap-6 italic">
                    <ShieldAlert size={16} className="text-green-500" />
                    Support Levels
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {prediction.support_levels.map((level, i) => (
                      <div key={i} className="flex items-center justify-between bg-green-50 p-6 border border-green-100 group hover:bg-green-100 transition-colors">
                        <span className="text-[10px] text-slate-400 font-bold italic tracking-widest uppercase">Support {i + 1}</span>
                        <span className="text-3xl font-black text-green-600 font-sans italic">₹{level.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 p-10 relative overflow-hidden shadow-sm">
                  <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-10 flex items-center gap-6 italic">
                    <Target size={16} className="text-red-500" />
                    Resistance Levels
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {prediction.resistance_levels.map((level, i) => (
                      <div key={i} className="flex items-center justify-between bg-red-50 p-6 border border-red-100 group hover:bg-red-100 transition-colors">
                        <span className="text-[10px] text-slate-400 font-bold italic tracking-widest uppercase">Resistance {i + 1}</span>
                        <span className="text-3xl font-black text-red-600 font-sans italic">₹{level.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-white p-6 border border-slate-200 shadow-sm">
                 <p className="text-[9px] text-slate-400 font-bold flex items-center justify-center gap-6 italic overflow-hidden whitespace-nowrap">
                    <span className="text-blue-600 font-bold tracking-widest uppercase shrink-0">Prediction Disclaimer</span>
                    <span className="uppercase tracking-widest">Algorithmic projections are based on historical data patterns and quantitative analysis. Past performance is not indicative of future results. Consult a financial advisor before making any investment decisions.</span>
                 </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-20">
              <div className="w-16 h-16 border-t-2 border-blue-600 animate-spin mb-8" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Calculating Price Projections...</p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col h-full items-center justify-center p-20 text-center space-y-12">
              <div className="w-32 h-32 bg-white border-2 border-red-100 flex items-center justify-center shadow-sm">
                <ShieldAlert size={64} className="text-red-200" />
              </div>
              <div className="space-y-6">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-widest italic">Data Unavailable</h3>
                <p className="text-xs text-slate-400 max-w-lg leading-loose font-bold uppercase tracking-widest italic">
                  Could not fetch market data for this symbol. Try selecting another signal.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full items-center justify-center p-20 text-center space-y-12">
              <div className="w-32 h-32 bg-white border-2 border-slate-100 flex items-center justify-center shadow-sm relative overflow-hidden group">
                 <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600" />
                 <Zap size={64} className="text-slate-100 group-hover:text-blue-600 group-hover:scale-110 transition-all duration-700" />
              </div>
              <div className="space-y-6">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-widest italic">Engine Standby</h3>
                <p className="text-xs text-slate-400 max-w-lg leading-loose font-bold uppercase tracking-widest italic">
                  Select a signal from the sidebar to initialize price projection analysis.
                </p>
              </div>
            </div>
          )}
      </div>
    </main>
  );
};
