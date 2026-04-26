import React from 'react';
import { useStore } from '../store/useStore';
import { TradingTerminal } from '../components/TradingTerminal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Brain,
  Clock,
  Zap,
  Radar
} from 'lucide-react';

// Rounds any raw float in a string like "(₹1348.099...)"
const sanitizeReason = (reason: string) =>
  reason.replace(/₹?(\d+\.\d{3,})/g, (_m: string, n: string) => `₹${parseFloat(n).toFixed(2)}`);

// Smart price formatter — abbreviates large numbers and picks correct currency
const fmtPrice = (val: number | undefined | null, assetClass?: string): { text: string; currency: string } => {
  const currency = (assetClass === 'CRYPTO' || assetClass === 'EQUITY_US') ? '$' : '₹';
  if (val == null || isNaN(val)) return { text: '—', currency };
  if (val >= 1_000_000) return { text: `${(val / 1_000_000).toFixed(2)}M`, currency };
  if (val >= 10_000)   return { text: `${(val / 1_000).toFixed(1)}K`, currency };
  if (val < 1)         return { text: val.toFixed(4), currency };
  return { text: val.toLocaleString('en-IN', { maximumFractionDigits: 1 }), currency };
};

// Dynamic font class based on string length
const dynFont = (text: string): string => {
  const len = text.length;
  if (len <= 4)  return 'text-5xl';
  if (len <= 7)  return 'text-4xl';
  if (len <= 10) return 'text-3xl';
  return 'text-2xl';
};

export const AnalysisView: React.FC = () => {
  const { signals, activeSymbol, setActiveSymbol } = useStore();
  const activeSignal = signals.find((s) => s.symbol === activeSymbol);
  const [peersData, setPeersData] = React.useState<any>(null);
  const [peersLoading, setPeersLoading] = React.useState(false);

  React.useEffect(() => {
    if (activeSymbol) {
      setPeersLoading(true);
      fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/analyze/peers?symbol=${activeSymbol}`)
        .then(res => res.json())
        .then(data => {
          setPeersData(data);
          setPeersLoading(false);
        })
        .catch(() => setPeersLoading(false));
    }
  }, [activeSymbol]);

  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case 'BUY':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          text: 'text-green-500',
          glow: 'shadow-green-500/10',
          icon: <TrendingUp size={20} />,
        };
      case 'SELL':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-500',
          glow: 'shadow-red-500/10',
          icon: <TrendingDown size={20} />,
        };
      default:
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          text: 'text-yellow-500',
          glow: 'shadow-yellow-500/10',
          icon: <Minus size={20} />,
        };
    }
  };

  return (
    <main className="flex-1 h-full flex overflow-hidden bg-[#f8fafc] relative font-sans">
      
      {/* Signal List */}
      <aside className="w-80 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col h-full z-10 italic">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-[10px] uppercase tracking-widest text-blue-600 font-bold flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            Active Signals
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
          {signals.length === 0 ? (
            <div className="text-center py-24 text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">
              Awaiting Connectivity...
            </div>
          ) : (
            signals.map((sig: any) => {
              const rec = sig.recommendation || (sig.direction === 'bullish' ? 'BUY' : 'SELL');
              const isActive = sig.symbol === activeSymbol;
              return (
                <button
                  key={sig.id}
                  onClick={() => setActiveSymbol(sig.symbol)}
                  className={`w-full text-left p-5 transition-all group relative overflow-hidden border ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 shadow-md text-white'
                      : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <div className={`text-sm font-black tracking-tighter uppercase ${isActive ? 'text-white' : 'text-slate-900 group-hover:text-blue-600'}`}>{sig.symbol}</div>
                      <div className={`text-[8px] font-bold uppercase mt-1 ${
                        isActive ? 'text-blue-100' : (rec === 'BUY' ? 'text-green-600' : rec === 'SELL' ? 'text-red-600' : 'text-yellow-600')
                      }`}>
                        {rec} • {sig.confidence}% Conviction
                      </div>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 bg-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Command Console */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pb-20">
        <AnimatePresence mode="wait">
          {activeSignal ? (
            <motion.div
              key={activeSignal.symbol}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="p-10 max-w-6xl mx-auto space-y-8"
            >
              {/* Analysis Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-10 italic">
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 bg-white border border-slate-200 flex items-center justify-center shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-600/5" />
                    <Brain size={36} className="text-blue-600 relative z-10" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase">Ticker: {activeSymbol}</span>
                       <div className="h-[1px] w-12 bg-blue-100" />
                    </div>
                    <h1 className="text-7xl font-black text-slate-900 tracking-tighter leading-none uppercase">
                      {activeSignal.symbol}
                    </h1>
                    <div className="flex items-center gap-4 mt-6">
                      <div className="flex items-center gap-3 px-4 py-1.5 border border-blue-600 bg-blue-50 shadow-sm">
                        <Radar size={12} className="text-blue-600" />
                        <span className="text-[10px] text-blue-600 uppercase tracking-widest font-black">Live Intelligence</span>
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-2 font-sans">
                        <Clock size={12} className="opacity-40" />
                        Updated: {new Date(activeSignal.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Confidence Level */}
                <div className="text-right">
                  <div className="text-5xl font-black text-slate-900 leading-none tracking-tighter">{activeSignal.confidence}%</div>
                  <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-2">Analysis Probability</div>
                </div>
              </div>

              {/* Summary Banner */}
              {(() => {
                const rec = activeSignal.recommendation || activeSignal.direction?.toUpperCase();
                const style = getRecommendationStyle(rec);
                return (
                  <div className={`p-8 border border-slate-200 bg-white flex items-center justify-between relative overflow-hidden shadow-sm italic`}>
                    <div className="flex items-center gap-8 relative z-10">
                      <div className={`w-16 h-16 border italic font-black text-2xl ${style.border} bg-slate-50 flex items-center justify-center shadow-sm`}>
                        {style.icon}
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-2">Signal Recommendation</div>
                        <div className={`text-6xl font-black tracking-tight ${style.text}`}>{rec}</div>
                      </div>
                    </div>
                    <div className="text-right relative z-10">
                       <button className={`px-10 py-5 font-black text-[10px] tracking-[0.3em] uppercase transition-all shadow-md ${
                         rec === 'BUY' ? 'bg-green-600 text-white hover:bg-green-700' : 
                         rec === 'SELL' ? 'bg-red-600 text-white hover:bg-red-700' : 
                         'bg-yellow-600 text-white hover:bg-yellow-700'
                       }`}>
                         Execute Position &gt;&gt;
                       </button>
                    </div>
                  </div>
                );
              })()}

              {/* Command Deck Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Analysis Narrative */}
                <div className="lg:col-span-8 space-y-8 italic">
                  <div className="bg-white border border-slate-200 p-10 relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-20" />
                    <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-10 flex items-center gap-4">
                      <Zap size={14} /> Market Intelligence Report
                    </h3>
                    <h3 className="text-4xl font-black text-slate-900 leading-tight mb-8 uppercase tracking-tighter">
                      {activeSignal.narration?.headline}
                    </h3>
                    <p className="text-slate-600 text-xl leading-relaxed font-bold border-l-4 border-blue-600/20 pl-8 bg-slate-50/50 py-6 uppercase opacity-80">
                      "{activeSignal.narration?.what_happened}"
                    </p>
                    
                    {activeSignal.decision_reasons && (
                      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeSignal.decision_reasons.slice(0, 4).map((r, i) => (
                          <div key={i} className="p-6 bg-white border border-slate-100 text-[11px] text-slate-500 flex gap-4 shadow-sm hover:border-blue-400 transition-all font-sans">
                            <span className="text-blue-600 font-black opacity-20">PRM_{i+1}</span>
                            {sanitizeReason(r)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                   {/* Technical Indicators */}
                   {(() => {
                     const rsiVal = activeSignal.technical_indicators?.rsi_14;
                     const rsiStr = rsiVal != null ? String(Number(rsiVal).toFixed(1)) : '—';
                     const ema20Raw = activeSignal.technical_indicators?.ema_20;
                     const assetClass = activeSignal.trade_parameters?.asset_class;
                     const { text: emaText, currency: emaCurrency } = fmtPrice(ema20Raw, assetClass);
                     const macd = activeSignal.technical_indicators?.macd?.crossover || 'Stable';
                     return (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                         {/* RSI */}
                         <div className="bg-white p-8 border border-slate-200 shadow-sm overflow-hidden">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Relative Strength</div>
                           <div className={`${dynFont(rsiStr)} font-black leading-none truncate ${
                             (rsiVal || 0) > 70 ? 'text-red-600' : (rsiVal || 0) < 30 ? 'text-green-600' : 'text-slate-900'
                           }`}>
                             {rsiStr}
                           </div>
                           <div className="mt-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                             {(rsiVal || 0) > 70 ? 'Overbought' : (rsiVal || 0) < 30 ? 'Oversold' : 'Neutral Zone'}
                           </div>
                         </div>
                         {/* EMA-20 */}
                         <div className="bg-white p-8 border border-slate-200 shadow-sm overflow-hidden">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Moving Avg (20)</div>
                           <div className={`${dynFont(emaText)} font-black text-slate-900 italic tracking-tighter leading-none truncate`}>
                             {emaCurrency}{emaText}
                           </div>
                           <div className="mt-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">EMA-20</div>
                         </div>
                         {/* Momentum */}
                         <div className="bg-white p-8 border border-slate-200 shadow-sm overflow-hidden">
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Momentum Index</div>
                           <div className={`text-2xl font-black uppercase italic leading-none ${
                             macd === 'BULLISH' ? 'text-green-600' : macd === 'BEARISH' ? 'text-red-600' : 'text-yellow-600'
                           }`}>
                             {macd}
                           </div>
                           <div className="mt-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                             MACD Signal
                           </div>
                         </div>
                       </div>
                     );
                   })()}
                </div>

                {/* Peer Analysis */}
                <div className="lg:col-span-4 space-y-8 italic">
                  <div className="bg-white border border-slate-200 p-8 h-full relative overflow-hidden shadow-sm">
                    <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-12 flex items-center gap-4 relative z-10">
                      <Activity size={14} />
                      Sector Comparables
                    </h3>
                    
                    {peersLoading ? (
                      <div className="py-24 text-center text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 animate-pulse">Syncing Peer Analytics...</div>
                    ) : (
                      <div className="space-y-8 relative z-10">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 flex justify-between border-b border-slate-50 pb-4">
                          <span>Peer Group</span>
                          <span className="text-blue-600">Sector: {peersData?.sector}</span>
                        </div>
                        <div className="space-y-6">
                          {peersData?.peers?.map((peer: any) => (
                             <div key={peer.symbol} className={`p-6 border transition-all ${peer.is_target ? 'bg-blue-50 border-blue-600 shadow-md scale-105 z-20 relative' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                <div className="flex justify-between items-center mb-4">
                                  <span className={`text-lg font-black tracking-tighter ${peer.is_target ? 'text-slate-900' : 'text-slate-500'}`}>{peer.symbol}</span>
                                  <span className={`text-xs font-black font-sans ${peer.change_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {peer.change_pct >= 0 ? '+' : ''}{peer.change_pct}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 h-1">
                                  <div className={`h-full ${peer.change_pct >= 0 ? 'bg-green-600' : 'bg-red-600'}`} style={{ width: `${Math.min(100, Math.abs(peer.change_pct) * 20)}%` }} />
                                </div>
                             </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-12 p-6 bg-slate-50 border border-slate-100 text-[9px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
                      Comparative Sync Complete. Analytical Precision: 94%
                    </div>
                  </div>
                </div>

              </div>

              {/* Execution Interface */}
              <div className="relative group p-[2px] bg-blue-600/10">
                <div className="bg-white p-2">
                  <TradingTerminal signal={activeSignal} />
                </div>
              </div>

            </motion.div>
          ) : (
            <div className="flex flex-col h-full items-center justify-center italic">
               <div className="w-32 h-32 border border-slate-200 flex items-center justify-center mb-12 relative overflow-hidden bg-white shadow-lg">
                 <div className="absolute inset-0 bg-blue-600/5 shadow-inner" />
                 <Brain size={48} className="text-slate-200" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-[0.4em] mb-4">System Idle</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] font-sans">Select a Signal to Begin Analysis</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};
