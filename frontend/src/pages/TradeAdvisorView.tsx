import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Zap, Newspaper,
  AlertTriangle, RefreshCw, 
  DollarSign, Brain
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/advisor`;

const STOCKS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'SBIN', 'ITC', 'BHARTIARTL', 'WIPRO', 'LT',
  'MARUTI', 'BAJFINANCE', 'AXISBANK', 'KOTAKBANK', 'HINDUNILVR',
  'ASIANPAINT', 'TITAN', 'ULTRACEMCO', 'NESTLEIND', 'POWERGRID',
];

// ── Sub-components ──────────────────────────────────────────────────────

const Badge = ({ label, color }: { label: string; color: 'green' | 'red' | 'yellow' | 'blue' | 'indigo' }) => {
  const map = {
    green: 'bg-green-50 text-green-600 border-green-200 font-bold',
    red: 'bg-red-50 text-red-600 border-red-200 font-bold',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200 font-bold',
    blue: 'bg-blue-50 text-blue-600 border-blue-200 font-bold',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 font-bold',
  };
  return (
    <span className={`px-3 py-1 text-[9px] uppercase tracking-widest border italic ${map[color]}`}>
      {label}
    </span>
  );
};

const StatCard = ({ label, value, sub, color = 'gray' }: {
  label: string; value: string | number; sub?: string; color?: string
}) => (
  <div className="bg-white p-6 border border-slate-200 relative overflow-hidden group shadow-sm transition-all hover:border-blue-300">
    <div className="absolute top-0 right-0 w-1 h-full bg-slate-100 group-hover:bg-blue-600 transition-all" />
    <div className="text-[9px] uppercase font-bold text-slate-400 mb-2 tracking-widest italic">{label}</div>
    <div className={`text-2xl font-black font-sans tracking-tighter italic ${color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : color === 'indigo' ? 'text-indigo-600' : 'text-slate-900'}`}>
      {value}
    </div>
    {sub && <div className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">{sub}</div>}
  </div>
);

const TechIndicator = ({ label, value, signal }: { label: string; value: string; signal: 'bullish' | 'bearish' | 'neutral' }) => {
  const color = signal === 'bullish' ? 'text-green-600 font-bold' : signal === 'bearish' ? 'text-red-600 font-bold' : 'text-slate-500 font-bold';
  const bar = signal === 'bullish' ? 'bg-green-500' : signal === 'bearish' ? 'bg-red-500' : 'bg-slate-200';
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0 group">
      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest group-hover:text-slate-600 transition-colors">{label}</span>
      <div className="flex items-center gap-4">
        <div className={`w-8 h-[2px] ${bar}`}></div>
        <span className={`text-xs font-black font-sans tracking-tight uppercase italic ${color}`}>{value}</span>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────

export const TradeAdvisorView: React.FC = () => {
  // Input state
  const [symbol, setSymbol] = useState('RELIANCE');
  const [buyDate, setBuyDate] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [sellDate, setSellDate] = useState('');

  // Result state
  const [result, setResult] = useState<any>(null);
  const [profitResult, setProfitResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'advisor' | 'pnl'>('advisor');

  const today = new Date().toISOString().split('T')[0];

  const runAdvisor = useCallback(async () => {
    if (!buyDate) { setError('ERROR: SELECT_BUY_DATE_SEQUENCE_NULL'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API}/analyze/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          buy_date: buyDate,
          buy_price: buyPrice ? parseFloat(buyPrice) : null,
          quantity: parseInt(quantity) || 1,
        }),
      });
      const data = await res.json();
      if (data.status !== 'success') setError(data.message || 'ANALYSIS_PROTOCOL_FAULT');
      else setResult(data);
    } catch {
      setError('UPLINK_FAILURE: BACKEND_UNREACHABLE');
    } finally {
      setLoading(false);
    }
  }, [symbol, buyDate, buyPrice, quantity]);

  const runProfitCalc = useCallback(async () => {
    if (!buyDate || !sellDate) { setError('ERROR: DUAL_DATES_REQUIRED_FOR_SIMULATION'); return; }
    setLoading(true); setError(''); setProfitResult(null);
    try {
      const res = await fetch(`${API}/profit/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          buy_date: buyDate,
          sell_date: sellDate,
          buy_price: buyPrice ? parseFloat(buyPrice) : null,
          quantity: parseInt(quantity) || 1,
        }),
      });
      const data = await res.json();
      if (data.status !== 'success') setError(data.message || 'PNL_CALC_FAILED');
      else setProfitResult(data);
    } catch {
      setError('UPLINK_FAILURE: PROTOCOL_INTERRUPTED');
    } finally {
      setLoading(false);
    }
  }, [symbol, buyDate, sellDate, buyPrice, quantity]);

  const decision = result?.ai_decision;
  const tech = result?.technical_analysis;
  const news = result?.news_sentiment;
  const forecast = result?.forecast;
  const pnl = result?.pnl;
  const risk = result?.risk_management;

  const decisionColor = decision?.decision === 'BUY MORE' ? 'green'
    : decision?.decision === 'SELL' ? 'red' : 'yellow';
  const decisionGradient = decision?.decision === 'BUY MORE'
    ? 'bg-green-50 border-green-200'
    : decision?.decision === 'SELL'
    ? 'bg-red-50 border-red-200'
    : 'bg-yellow-50 border-yellow-200';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc] text-slate-900 font-sans relative">
      <div className="shrink-0 px-8 py-8 border-b border-slate-200 bg-white relative z-10 overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-white border border-slate-200 flex items-center justify-center shadow-sm group relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600" />
              <Zap size={32} className="text-blue-600 relative z-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">AI Trade Advisor</h1>
              <div className="flex items-center gap-3 mt-3">
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                 <p className="text-[10px] uppercase tracking-widest font-bold text-blue-600">Quantitative Analysis Active</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-200">
            <button onClick={() => setActiveTab('advisor')} className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest cubic-bezier transition-all ${activeTab === 'advisor' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-blue-600'}`}>
              Trade Advisor
            </button>
            <button onClick={() => setActiveTab('pnl')} className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest cubic-bezier transition-all ${activeTab === 'pnl' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-blue-600'}`}>
              P&L Calculator
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 relative z-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-12">

          {/* Input Panel */}
          <div className="bg-white p-10 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-blue-600 transition-all" />
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-6 italic">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              Trade Parameters
              <div className="h-[1px] flex-1 bg-slate-100" />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative z-10">
              {/* Stock selector */}
              <div>
                <label className="text-[9px] text-slate-400 uppercase font-bold mb-3 block tracking-widest italic">Ticker Symbol</label>
                <select
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600 transition-colors font-bold uppercase italic"
                >
                  {STOCKS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Buy Date */}
              <div>
                <label className="text-[9px] text-slate-400 uppercase font-bold mb-3 block tracking-widest italic">Purchase Date</label>
                <input
                  type="date"
                  max={today}
                  value={buyDate}
                  onChange={e => setBuyDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600 transition-colors font-bold uppercase"
                />
              </div>
              {/* Buy Price */}
              <div>
                <label className="text-[9px] text-slate-400 uppercase font-bold mb-3 block tracking-widest italic">Purchase Price (₹)</label>
                <input
                  type="number" placeholder="Synchronizing..."
                  value={buyPrice}
                  onChange={e => setBuyPrice(e.target.value)}
                   className="w-full bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder-slate-200 focus:outline-none focus:border-blue-600 transition-colors font-bold uppercase italic"
                />
              </div>
              {/* Quantity */}
              <div>
                <label className="text-[9px] text-slate-400 uppercase font-bold mb-3 block tracking-widest italic">Quantity</label>
                <input
                  type="number" min="1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600 transition-colors font-bold uppercase italic"
                />
              </div>
              {/* Sell Date (for P&L) */}
              {activeTab === 'pnl' && (
                <div>
                  <label className="text-[9px] text-slate-400 uppercase font-bold mb-3 block tracking-widest italic">Sell Date</label>
                  <input
                    type="date"
                    max={today}
                    value={sellDate}
                    onChange={e => setSellDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600 transition-colors font-bold uppercase"
                  />
                </div>
              )}

              {/* Action Button */}
              <div className={activeTab === 'pnl' ? 'col-span-2 md:col-span-1' : ''}>
                <div className="h-8" />
                <button
                  disabled={loading}
                  onClick={activeTab === 'advisor' ? runAdvisor : runProfitCalc}
                  className={`w-full py-4 font-bold text-[11px] uppercase tracking-widest italic transition-all flex items-center justify-center gap-4 border ${
                    loading
                      ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                      : 'bg-white border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm'
                  }`}
                >
                  {loading ? <><RefreshCw className="w-5 h-5 animate-spin" /> Executing...</> : <><Zap className="w-5 h-5" /> {activeTab === 'advisor' ? 'Run Advisor' : 'Calculate P&L'}</>}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                className="mt-8 p-4 bg-red-50 border border-red-200 flex items-center gap-4 text-red-600 text-xs font-bold uppercase tracking-widest italic shadow-sm">
                <AlertTriangle className="w-5 h-5" /> {error}
              </motion.div>
            )}
          </div>

          {/* ── PNL_QUANT_SIMULATOR Result ── */}
          <AnimatePresence>
            {activeTab === 'pnl' && profitResult && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-12 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-12 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                      <DollarSign className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-900 text-3xl uppercase tracking-tighter italic">P&L Analysis</h2>
                      <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-3 italic">Simulation Complete</div>
                    </div>
                  </div>
                  <Badge label={profitResult.outcome} color={profitResult.outcome === 'PROFIT' ? 'green' : 'red'} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-slate-100 bg-white shadow-sm">
                  <StatCard label="Purchase Price" value={`₹${profitResult.buy_price.toLocaleString('en-IN')}`} />
                  <StatCard label="Sell Price" value={`₹${profitResult.sell_price.toLocaleString('en-IN')}`} />
                  <StatCard label="Net P&L (₹)" value={`${profitResult.pnl_absolute >= 0 ? '+' : ''}₹${profitResult.pnl_absolute.toLocaleString('en-IN')}`} color={profitResult.pnl_absolute >= 0 ? 'green' : 'red'} />
                  <StatCard label="Total ROI %" value={`${profitResult.pnl_percent >= 0 ? '+' : ''}${profitResult.pnl_percent}%`} color={profitResult.pnl_percent >= 0 ? 'green' : 'red'} />
                </div>

                <div className="grid grid-cols-3 gap-0 border-x border-slate-100 bg-slate-50">
                  <StatCard label="CAGR" value={`${profitResult.cagr}%`} sub="Annualized Yield" color={profitResult.cagr >= 0 ? 'green' : 'red'} />
                  <StatCard label="Holding Period" value={`${profitResult.holding_days} Days`} />
                  <StatCard label="Total Units" value={`${profitResult.quantity}`} sub={`Total Exposure: ₹${(profitResult.buy_price * profitResult.quantity).toLocaleString('en-IN')}`} />
                </div>

                <div className="mt-12 p-6 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center italic">
                  Disclaimer: P&L values are based on historical simulations and actual results may vary.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Advisor Results ── */}
          <AnimatePresence>
            {activeTab === 'advisor' && result && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">

                {/* Row 1: Summary + AI Decision */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                  {/* Trade Summary */}
                  <div className="bg-white p-10 border border-slate-200 relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-blue-600 transition-colors" />
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10 italic">Trade Summary</h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Ticker</span>
                        <span className="text-sm font-black text-slate-900 tracking-tighter italic uppercase">{result.symbol}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Purchase Basis</span>
                        <span className="text-sm font-black text-slate-900 tracking-tighter">₹{result.buy_price.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Market Price</span>
                        <span className="text-sm font-black text-blue-600 tracking-tighter">₹{result.current_price.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Time Period</span>
                        <span className="text-sm font-black text-slate-900 italic uppercase tracking-tighter">{result.holding_days} Days</span>
                      </div>
                      <div className="pt-8 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Unrealized P&L</span>
                          <span className={`text-3xl font-black tracking-tighter italic ${pnl.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pnl.absolute >= 0 ? '+' : ''}₹{pnl.absolute.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">ROI Percentage</span>
                          <span className={`text-sm font-black italic ${pnl.percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pnl.percent >= 0 ? '+' : ''}{pnl.percent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Verdict */}
                  <div className={`lg:col-span-2 bg-white p-10 border relative overflow-hidden group shadow-sm ${decisionGradient}`}>
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-12">
                        <div>
                          <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-4 italic">AI Verdict</div>
                          <div className={`text-6xl font-black tracking-tighter uppercase italic ${decisionColor === 'green' ? 'text-green-600' : decisionColor === 'red' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {decision?.decision}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4 italic">Confidence Level</div>
                          <div className="text-6xl font-black text-slate-900 tracking-tighter italic">{decision?.confidence}<span className="text-xl text-slate-300 ml-2 font-bold">%</span></div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-12">
                        <div className="h-2 bg-slate-100 overflow-hidden border border-slate-200">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${decision?.confidence}%` }}
                            transition={{ duration: 1.5, ease: 'circOut' }}
                            className={`h-full ${decisionColor === 'green' ? 'bg-green-500' : decisionColor === 'red' ? 'bg-red-500' : 'bg-yellow-500'}`}
                          />
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="bg-slate-50 p-8 border border-slate-100 mb-10 flex-1 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-20" />
                        <div className="flex items-start gap-6">
                          <div className="w-14 h-14 bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                            <Brain size={28} className="text-blue-600" />
                          </div>
                          <p className="text-lg text-slate-700 leading-relaxed font-bold uppercase italic tracking-tight">"{decision?.explanation}"</p>
                        </div>
                      </div>

                      {/* Rationale Chips */}
                      <div className="flex flex-wrap gap-4">
                        <Badge label={`Risk: ${decision?.risk_level}`} color={decision?.risk_level === 'HIGH' ? 'red' : decision?.risk_level === 'MEDIUM' ? 'yellow' : 'green'} />
                        {forecast && <Badge label={`Optimal Exit: ${forecast.best_sell_window}`} color="indigo" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Tech Pulse + Market Narrative */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                  {/* Technical Pulse Station */}
                  <div className="bg-white p-10 border border-slate-200 relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-blue-600 transition-all" />
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-4 italic">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      Technical Pulse
                    </h3>
                    <div className="space-y-2">
                       <TechIndicator label="RSI (Daily)" value={tech?.rsi?.toFixed(1) || '0.0'} signal={tech?.rsi < 30 ? 'bullish' : tech?.rsi > 70 ? 'bearish' : 'neutral'} />
                       <TechIndicator label="MACD Signal" value={tech?.macd || '0.00'} signal={tech?.macd_signal === 'BUY' ? 'bullish' : tech?.macd_signal === 'SELL' ? 'bearish' : 'neutral'} />
                       <TechIndicator label="Moving Avg Trend" value={tech?.ma_trend || 'NEUTRAL'} signal={tech?.ma_trend === 'BULLISH' ? 'bullish' : tech?.ma_trend === 'BEARISH' ? 'bearish' : 'neutral'} />
                       <TechIndicator label="Volatility Index" value={tech?.volatility === 'HIGH' ? 'EXTREME' : 'STABLE'} signal={tech?.volatility === 'HIGH' ? 'bearish' : 'neutral'} />
                    </div>
                  </div>

                  {/* Market Sentiment */}
                  <div className="bg-white p-10 border border-slate-200 relative overflow-hidden group shadow-sm">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-4 italic">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      Market Sentiment
                    </h3>
                    <div className="flex items-center gap-8 mb-10">
                      <div className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">{news?.sentiment}</div>
                      <div className="flex-1 h-[2px] bg-slate-100 overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${news?.score * 10}%` }}
                          className={`h-full absolute left-0 top-0 ${news?.sentiment === 'POSITIVE' ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-6 relative overflow-hidden">
                      <div className="flex items-center gap-4 mb-4">
                        <Newspaper size={16} className="text-blue-600 opacity-60" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">AI Narrative Summary</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed italic font-bold uppercase tracking-tight">"{news?.reason}"</p>
                    </div>
                  </div>
                </div>

                {/* Price Forecasts */}
                <div className="bg-white p-12 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-12 relative z-10">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-6 italic">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      Price Forecasts
                    </h3>
                    <div className="px-5 py-2 bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                      Projection Model: v9.2
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-slate-100">
                    {[
                      { horizon: 'Short Term (T+5)', price: forecast?.t_5, pnl: forecast?.pnl_5 },
                      { horizon: 'Mid Term (T+10)', price: forecast?.t_10, pnl: forecast?.pnl_10 },
                      { horizon: 'Long Term (T+30)', price: forecast?.t_30, pnl: forecast?.pnl_30 },
                    ].map((f, i) => (
                      <div key={i} className="bg-white p-10 border border-slate-50 hover:bg-slate-50 transition-all group/item relative overflow-hidden">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6 group-hover:text-blue-600 transition-colors italic">{f.horizon}</div>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter mb-4 italic group-hover:scale-105 transition-transform origin-left">₹{f.price?.toLocaleString('en-IN')}</div>
                        <div className={`text-[11px] font-bold uppercase tracking-widest italic ${f.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {f.pnl >= 0 ? 'Projected Gain' : 'Projected Risk'} <span className="ml-2 underline">{f.pnl}%</span>
                        </div>
                        <div className="mt-8 w-full bg-slate-100 h-[2px] relative overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, Math.abs(f.pnl || 0) * 8)}%` }}
                            className={`h-full absolute top-0 left-0 ${f.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="bg-white p-10 border border-slate-200 relative overflow-hidden shadow-sm">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10 italic">Risk Management</h3>
                    <div className="grid grid-cols-2 gap-0 border border-slate-100">
                      <div className="p-8 bg-red-50 border-r border-slate-100 transition-all">
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-4 italic">Stop Loss</div>
                        <div className="text-3xl font-black text-red-600 tracking-tighter italic">₹{risk?.stop_loss_suggested || risk?.stop_loss?.toLocaleString('en-IN')}</div>
                        <div className="h-0.5 w-12 bg-red-200 mt-4" />
                      </div>
                      <div className="p-8 bg-white transition-all">
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-4 italic">Target Price</div>
                        <div className="text-3xl font-black text-green-600 tracking-tighter italic">₹{risk?.target_1 || risk?.target?.toLocaleString('en-IN')}</div>
                        <div className="h-0.5 w-12 bg-green-200 mt-4" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-10 border border-slate-200 relative overflow-hidden flex flex-col justify-center shadow-sm">
                    <div className="flex items-center gap-8 relative z-10">
                      <div className="w-20 h-20 bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                        <ShieldAlert size={40} className="text-red-500" />
                      </div>
                      <div>
                        <div className="text-[10px] text-red-600 font-bold uppercase tracking-widest mb-4 italic">Advisor Remark</div>
                        <p className="text-xl text-slate-900 font-black leading-tight italic uppercase">"{risk?.safety_remark || 'Maintain strict stop discipline. Monitor sector performance.'}"</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="bg-white p-6 border border-slate-200 shadow-sm">
                  <p className="text-[9px] text-slate-400 font-bold flex items-center justify-center gap-6 italic">
                    <span className="text-blue-600 font-bold tracking-widest uppercase">Institutional Disclosure</span>
                    <span className="uppercase tracking-widest">{result.disclaimer || 'Algorithmic simulation only. No guaranteed returns. Consult a financial advisor.'}</span>
                  </p>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Standby State */}
          {!result && !profitResult && !loading && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 space-y-12 bg-white border border-dashed border-slate-200 p-20 shadow-sm">
              <div className="w-32 h-32 bg-white border border-slate-100 flex items-center justify-center mb-0 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600" />
                <Zap size={64} className="text-slate-100 group-hover:text-blue-600 group-hover:scale-125 transition-all duration-700" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-widest mb-6 italic">System Ready</h3>
                <p className="text-xs text-slate-400 text-center max-w-lg leading-loose font-bold uppercase tracking-widest italic">
                  Select a security and input purchase parameters to initialize analysis.
                  The engine will simulate multi-horizon projections and provide a detailed verdict.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
