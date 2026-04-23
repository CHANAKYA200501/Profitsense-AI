import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createChart, ColorType, CrosshairMode, BaselineSeries } from 'lightweight-charts';
import { Beaker, Play, TrendingUp, TrendingDown, BarChart3, Target, Shield, Activity, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';

const STRATEGIES = [
  { id: 'SMA_CROSSOVER', label: 'SMA Crossover', desc: 'Buy when fast MA crosses above slow MA' },
  { id: 'RSI_REVERSAL', label: 'RSI Reversal', desc: 'Buy oversold, sell overbought' },
  { id: 'MACD_SIGNAL', label: 'MACD Signal', desc: 'Buy/sell on MACD-Signal line crossover' },
];

const PERIODS = [
  { id: '3mo', label: '3 Months' },
  { id: '6mo', label: '6 Months' },
  { id: '1y', label: '1 Year' },
  { id: '2y', label: '2 Years' },
];

const STOCK_LIST = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'SBIN', 'ITC', 'KOTAKBANK', 'LT', 'AXISBANK',
  'MARUTI', 'SUNPHARMA', 'WIPRO', 'TATAMOTORS', 'HCLTECH',
];

interface BacktestResult {
  status: string;
  symbol: string;
  strategy: string;
  period: string;
  metrics: {
    initial_capital: number;
    final_value: number;
    total_return_pct: number;
    buy_hold_return_pct: number;
    total_trades: number;
    win_rate: number;
    max_drawdown_pct: number;
    sharpe_ratio: number;
  };
  trades: Array<{
    date: string;
    action: string;
    price: number;
    shares: number;
    value: number;
    pnl?: number;
    pnl_pct?: number;
  }>;
  equity_curve: Array<{ date: string; value: number }>;
}

export const BacktestView: React.FC = () => {
  const { signals } = useStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);

  const [symbol, setSymbol] = useState('RELIANCE');
  const [strategy, setStrategy] = useState('SMA_CROSSOVER');
  const [period, setPeriod] = useState('1y');
  const [capital, setCapital] = useState(100000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Merge store signals into stock list
  const allSymbols = Array.from(new Set([
    ...STOCK_LIST,
    ...signals.map((s: any) => s.symbol),
  ]));

  const destroyChart = useCallback(() => {
    if (chartInstance.current) {
      try { chartInstance.current.remove(); } catch {}
      chartInstance.current = null;
    }
  }, []);

  const runBacktest = useCallback(async () => {
    setLoading(true);
    setError(null);
    destroyChart();

    try {
      const res = await fetch('http://localhost:8000/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          strategy,
          period,
          initial_capital: capital,
        }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setResult(json);
      } else {
        setError(json.error || 'Backtest failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [symbol, strategy, period, capital, destroyChart]);

  // Build equity curve chart when result changes
  useEffect(() => {
    if (!result || !result.equity_curve?.length) return;
    const raf = requestAnimationFrame(() => {
      if (!chartRef.current) return;
      destroyChart();
      try {
        const chart = createChart(chartRef.current!, {
          autoSize: true,
          layout: {
            background: { type: ColorType.Solid, color: 'transparent' },
            textColor: '#64748b',
            fontFamily: 'Inter, sans-serif',
          },
          grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
          crosshair: { mode: CrosshairMode.Normal },
          rightPriceScale: { borderColor: '#e2e8f0' },
          timeScale: { borderColor: '#e2e8f0' },
        });
        chartInstance.current = chart;

        const baseValue = result.metrics.initial_capital;
        const series = chart.addSeries(BaselineSeries, {
          baseValue: { type: 'price', price: baseValue },
          topLineColor: '#22c55e',
          topFillColor1: 'rgba(34, 197, 94, 0.15)',
          topFillColor2: 'rgba(34, 197, 94, 0.02)',
          bottomLineColor: '#ef4444',
          bottomFillColor1: 'rgba(239, 68, 68, 0.02)',
          bottomFillColor2: 'rgba(239, 68, 68, 0.15)',
          lineWidth: 2,
        });

        const chartData = result.equity_curve.map((pt) => ({
          time: pt.date as any,
          value: pt.value,
        }));
        series.setData(chartData);
        chart.timeScale().fitContent();
      } catch (err) {
        console.error('Chart error:', err);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [result, destroyChart]);

  useEffect(() => {
    return () => destroyChart();
  }, [destroyChart]);

  const m = result?.metrics;

  return (
    <main className="flex-1 overflow-y-auto bg-[#f8fafc] font-sans custom-scrollbar">
      <div className="p-10 max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex justify-between items-center italic">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-white border border-slate-200 flex items-center justify-center shadow-sm relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600" />
              <Beaker size={32} className="text-blue-600 relative z-10" />
            </div>
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Simulation Lab</h2>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Strategic Backtesting Engine</p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white border border-slate-200 p-8 shadow-sm italic">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-4">
            Simulation Parameters
            <div className="h-[1px] flex-1 bg-slate-100" />
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Symbol */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 uppercase tracking-tight focus:outline-none focus:border-blue-600 transition-colors"
              >
                {allSymbols.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Strategy */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 tracking-tight focus:outline-none focus:border-blue-600 transition-colors"
              >
                {STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 tracking-tight focus:outline-none focus:border-blue-600 transition-colors"
              >
                {PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Capital */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Initial Capital (₹)</label>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 font-sans tracking-tight focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          {/* Strategy Description */}
          <div className="mt-4 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            {STRATEGIES.find(s => s.id === strategy)?.desc}
          </div>

          {/* Run Button */}
          <div className="mt-6 flex items-center gap-6">
            <button
              onClick={runBacktest}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-md flex items-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-t-2 border-white animate-spin" />
                  Running Simulation...
                </>
              ) : (
                <>
                  <Play size={14} /> Execute Backtest <ChevronRight size={14} />
                </>
              )}
            </button>
            {error && (
              <div className="text-[10px] text-red-600 font-bold uppercase tracking-widest">{error}</div>
            )}
          </div>
        </div>

        {/* Results */}
        {result && m && (
          <div className="space-y-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 italic">
              <MetricCard
                icon={<TrendingUp size={20} />}
                label="Total Return"
                value={`${m.total_return_pct >= 0 ? '+' : ''}${m.total_return_pct}%`}
                color={m.total_return_pct >= 0 ? 'green' : 'red'}
                sub={`₹${m.initial_capital.toLocaleString('en-IN')} → ₹${m.final_value.toLocaleString('en-IN')}`}
              />
              <MetricCard
                icon={<BarChart3 size={20} />}
                label="Buy & Hold"
                value={`${m.buy_hold_return_pct >= 0 ? '+' : ''}${m.buy_hold_return_pct}%`}
                color={m.buy_hold_return_pct >= 0 ? 'green' : 'red'}
                sub="Benchmark comparison"
              />
              <MetricCard
                icon={<Target size={20} />}
                label="Win Rate"
                value={`${m.win_rate}%`}
                color={m.win_rate >= 50 ? 'green' : 'red'}
                sub={`${m.total_trades} total trades`}
              />
              <MetricCard
                icon={<Shield size={20} />}
                label="Max Drawdown"
                value={`-${m.max_drawdown_pct}%`}
                color="red"
                sub={`Sharpe: ${m.sharpe_ratio}`}
              />
            </div>

            {/* Alpha Badge */}
            {m.total_return_pct > m.buy_hold_return_pct ? (
              <div className="bg-green-50 border border-green-200 p-5 flex items-center gap-4 italic">
                <TrendingUp size={18} className="text-green-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-green-700">
                  Strategy outperformed Buy & Hold by +{(m.total_return_pct - m.buy_hold_return_pct).toFixed(2)}% — Positive Alpha Generated
                </span>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 p-5 flex items-center gap-4 italic">
                <TrendingDown size={18} className="text-red-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-700">
                  Strategy underperformed Buy & Hold by {(m.total_return_pct - m.buy_hold_return_pct).toFixed(2)}% — Negative Alpha
                </span>
              </div>
            )}

            {/* Equity Curve */}
            <div className="bg-white border border-slate-200 shadow-sm p-8 italic">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-4">
                <Activity size={14} className="text-blue-600" />
                Equity Curve
                <div className="h-[1px] flex-1 bg-slate-100" />
                <span className="text-blue-600">
                  {result.symbol} / {STRATEGIES.find(s => s.id === result.strategy)?.label} / {result.period}
                </span>
              </h3>
              <div ref={chartRef} className="w-full h-[400px]" />
            </div>

            {/* Trade Log */}
            {result.trades.length > 0 && (
              <div className="bg-white border border-slate-200 shadow-sm p-8 italic">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-4">
                  Trade Log (Last {result.trades.length})
                  <div className="h-[1px] flex-1 bg-slate-100" />
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-4 text-slate-400 font-bold uppercase tracking-widest">Date</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-bold uppercase tracking-widest">Action</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-bold uppercase tracking-widest">Price</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-bold uppercase tracking-widest">Shares</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-bold uppercase tracking-widest">Value</th>
                        <th className="text-right py-3 px-4 text-slate-400 font-bold uppercase tracking-widest">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.map((trade, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-700 font-sans">{trade.date}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest border ${
                              trade.action === 'BUY'
                                ? 'bg-green-50 text-green-600 border-green-200'
                                : 'bg-red-50 text-red-600 border-red-200'
                            }`}>
                              {trade.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 font-sans">₹{trade.price.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-600 font-sans">{trade.shares}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 font-sans">₹{trade.value.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-bold font-sans">
                            {trade.pnl !== undefined ? (
                              <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toLocaleString('en-IN')} ({trade.pnl_pct}%)
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!result && !loading && (
          <div className="bg-white border border-slate-200 shadow-sm flex items-center justify-center p-20 relative overflow-hidden group italic">
            <div className="absolute top-0 right-0 w-64 h-full bg-blue-600/5 skew-x-[45deg] translate-x-32" />
            <div className="absolute bottom-0 left-0 w-64 h-full bg-blue-600/5 skew-x-[45deg] -translate-x-32" />
            <div className="relative z-10 text-center max-w-2xl space-y-8">
              <div className="w-24 h-24 mx-auto bg-white border border-slate-200 flex items-center justify-center shadow-sm relative overflow-hidden group-hover:border-blue-600 transition-colors duration-700">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600 opacity-20" />
                <Beaker size={48} className="text-slate-100 group-hover:text-blue-600 transition-all duration-700" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Ready to Simulate</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-loose">
                  Configure parameters above and click Execute Backtest to run a strategy simulation against historical NSE data.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

// Metric Card Component
function MetricCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string; color: string; sub: string;
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-600 bg-green-50 border-green-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
  };
  const textColor = color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : 'text-blue-600';

  return (
    <div className="bg-white border border-slate-200 p-6 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 ${colorMap[color] || colorMap.blue} border flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className={`text-2xl font-black font-sans tracking-tighter ${textColor}`}>{value}</div>
      <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-2">{sub}</div>
    </div>
  );
}
