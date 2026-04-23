import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Play, Loader, RefreshCw, Search } from 'lucide-react';

export const SignalFeed: React.FC = () => {
  const { signals, setActiveSymbol, setSignals, activeSymbol } = useStore();
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSignals = useMemo(() => {
    if (!searchQuery) return signals;
    const lowerQuery = searchQuery.toLowerCase();
    return signals.filter(sig => 
      sig.symbol.toLowerCase().includes(lowerQuery) ||
      (sig.narration && sig.narration.headline.toLowerCase().includes(lowerQuery))
    );
  }, [signals, searchQuery]);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/scan_now`, { method: 'POST' });
      const json = await res.json();
      if (json.status === 'success' && json.signals?.length > 0) {
        setSignals(json.signals);
        setActiveSymbol(json.signals[0].symbol);
      }
    } catch (e) {
      console.error('Scan request failed', e);
    } finally {
      setIsScanning(false);
    }
  }, [setSignals, setActiveSymbol]);

  // Auto-scan on mount if no signals
  useEffect(() => {
    if (signals.length === 0) {
      runScan();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="overflow-hidden h-full flex flex-col shadow-sm border border-slate-200 bg-white italic">
      <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between relative overflow-hidden">
        <div className="flex flex-col relative z-10 w-full">
          <div className="flex items-center justify-between w-full mb-4">
            <h2 className="text-[10px] uppercase tracking-widest font-black text-blue-600 flex items-center gap-3">
               <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
               Active Signals
            </h2>
            <div className="flex items-center space-x-3 relative z-10">
              <button 
                onClick={runScan} 
                disabled={isScanning}
                className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 transition disabled:opacity-30 cursor-pointer shadow-md"
              >
                {isScanning ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
                {isScanning ? 'Syncing' : 'Analyze'}
              </button>
              <button 
                onClick={runScan} 
                disabled={isScanning}
                className="flex items-center justify-center w-10 h-10 bg-white hover:bg-slate-50 text-slate-400 hover:text-blue-600 border border-slate-200 shadow-sm transition-all group"
              >
                <RefreshCw size={14} className={isScanning ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              </button>
            </div>
          </div>
          
          <div className="relative w-full">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-slate-400" />
             </div>
             <input
                type="text"
                placeholder="SEARCH TICKER OR SECTOR (E.G., ENERGY, AUTO, WORLDWIDE)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-inner italic transition-all"
             />
          </div>
          <span className="text-[8px] text-slate-400 font-bold mt-3 uppercase tracking-widest opacity-60">Coverage: NSE & Global Equities</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
        <AnimatePresence>
          {isScanning && signals.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Fetching Market Signals...</p>
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="text-center py-20 text-gray-700">
               <span className="text-[10px] font-black uppercase tracking-widest">{searchQuery ? 'No matching signals found.' : 'Waiting for Data Feed...'}</span>
            </div>
          ) : (
            filteredSignals.map((sig: any) => {
              const rec = sig.recommendation || (sig.direction === 'bullish' ? 'BUY' : 'SELL');
              const isActive = activeSymbol === sig.symbol;
              
              return (
                <motion.div
                  key={sig.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setActiveSymbol(sig.symbol)}
                  className={`cursor-pointer p-6 transition-all group relative border-l-2 ${
                    isActive ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-transparent bg-white border border-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
                          {sig.symbol}
                        </span>
                        <div className={`text-[9px] font-black uppercase px-2 py-1 ${
                          rec === 'BUY' ? 'text-green-600 bg-green-50 shadow-sm' : 'text-red-600 bg-red-50 shadow-sm'
                        }`}>
                          {rec}
                        </div>
                      </div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Analysis Clock: {new Date(sig.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    
                    <div className="text-right">
                       <div className="text-3xl font-black text-slate-900 leading-none mb-1 font-sans">{sig.confidence}%</div>
                       <div className="text-[7px] text-blue-600 font-bold uppercase tracking-widest">Conviction</div>
                    </div>
                  </div>
                  
                  {/* Probability Vector */}
                  <div className="w-full h-1 bg-slate-100 mb-6 relative overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${sig.confidence}%` }}
                        className={`h-full relative z-10 ${rec === 'BUY' ? 'bg-green-600' : 'bg-red-600'}`}
                     />
                  </div>

                  {/* Intelligence parameters */}
                  {sig.trade_parameters && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white p-3 border border-slate-100 shadow-sm">
                        <div className="text-[7px] text-slate-400 font-bold uppercase mb-1">Price Target</div>
                        <div className="text-xs font-black text-slate-900 font-sans tracking-tight">₹{sig.trade_parameters.target}</div>
                      </div>
                      <div className="bg-white p-3 border border-slate-100 shadow-sm">
                        <div className="text-[7px] text-slate-400 font-bold uppercase mb-1">Stop Loss</div>
                        <div className="text-xs font-black text-red-600 font-sans tracking-tight">₹{sig.trade_parameters.stop_loss}</div>
                      </div>
                    </div>
                  )}

                  {/* Analysis Narrative */}
                  {sig.narration && (
                    <div className="relative group/intel">
                      <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase opacity-80 border-l-2 border-blue-600/10 pl-4">
                        "{sig.narration.what_happened}"
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-6 flex items-center justify-between">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => <div key={i} className={`w-1 h-3 rounded-full ${isActive ? 'bg-blue-600 opacity-20' : 'bg-slate-100'}`} />)}
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest transition-all italic ${isActive ? 'text-blue-600' : 'text-slate-300 group-hover:text-blue-600'}`}>
                          Detailed Report &gt;&gt;
                      </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Signal Status */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 italic">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
               <span className="text-[9px] text-slate-400 font-black tracking-widest uppercase">System Operational</span>
            </div>
            <span className="text-[8px] text-slate-300 font-bold uppercase">v3.0.4-stable</span>
         </div>
      </div>
    </div>
  );
};
