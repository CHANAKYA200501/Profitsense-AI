import React, { useEffect, useState, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, X, Brain, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsItem {
  title: string;
  summary: string;
  published: string;
  link: string;
  source: string;
}

interface MarketStats {
  open: number;
  high: number;
  low: number;
  close: number;
  prev_close: number;
  change_pct: number;
  volume: number | string;
}

interface MarketReport {
  indices: {
    [key: string]: {
      snapshot: MarketStats;
      technical: {
        rsi_14: number;
        ema_20: number;
        ema_50: number;
        trend_signal: string;
      };
      trend: string;
    };
  };
  market_intelligence: {
    sectors: { [key: string]: number };
    top_gainers: any[];
    top_losers: any[];
    aggregated_nifty_volume: number;
    ai_insight: string;
  };
  news: NewsItem[];
}



export const MarketView: React.FC = () => {
  const [report, setReport] = useState<MarketReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomains] = useState<string[]>(['Markets', 'Stocks', 'Economy']);
  const [notifications, setNotifications] = useState<NewsItem[]>([]);
  const [notificationsEnabled] = useState(true);
  const previousNewsIds = useRef<Set<string>>(new Set());

  const fetchMarketData = useCallback(async (isInitial: boolean = false) => {
    try {
      const reportRes = await fetch('http://localhost:8000/api/market/report');
      const reportJson = await reportRes.json();
      const overviewRes = await fetch('http://localhost:8000/api/market/overview');
      const overviewJson = await overviewRes.json();
      
      if (reportJson.status === 'success' && overviewJson.status === 'success') {
        const fullReport = {
          ...reportJson.report,
          news: overviewJson.news || []
        };
        const newNews = overviewJson.news || [];
        if (!isInitial && notificationsEnabled && newNews.length > 0) {
          const newItems = newNews.filter((item: NewsItem) => !previousNewsIds.current.has(item.title));
          if (newItems.length > 0) {
            const domainFiltered = newItems.filter((item: NewsItem) =>
              selectedDomains.some(domain =>
                item.title.toLowerCase().includes(domain.toLowerCase()) ||
                item.summary.toLowerCase().includes(domain.toLowerCase())
              )
            );
            if (domainFiltered.length > 0) {
              setNotifications(prev => [...domainFiltered.slice(0, 3), ...prev].slice(0, 5));
            }
          }
        }
        newNews.forEach((item: NewsItem) => previousNewsIds.current.add(item.title));
        setReport(fullReport);
      } else {
        if (isInitial) setError('Failed to fetch intelligence reports');
      }
    } catch (err) {
      if (isInitial) setError('Network error fetching market telemetry.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [notificationsEnabled, selectedDomains]);

  useEffect(() => {
    fetchMarketData(true);
    const interval = setInterval(() => fetchMarketData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  const dismissNotification = (idx: number) => {
    setNotifications(prev => prev.filter((_, index) => index !== idx));
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f8fafc] text-blue-600 font-sans relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-64 h-1 bg-slate-200 border border-slate-300 relative overflow-hidden mb-4 shadow-sm">
             <motion.div 
               initial={{ x: '-100%' }}
               animate={{ x: '100%' }}
               transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
               className="absolute inset-0 bg-blue-600"
             />
          </div>
          <p className="font-bold uppercase tracking-[0.3em] text-[10px] italic">Synchronizing Market Data...</p>
          <div className="mt-2 text-[8px] text-slate-400 font-bold uppercase tracking-widest italic">Source: NSE_REALTIME_STREAM</div>
        </div>
      </div>
    );
  }

  if (error || !report || !report.indices || !report.market_intelligence) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f8fafc] text-slate-900 font-sans">
        <div className="p-10 border border-slate-200 bg-white shadow-sm flex flex-col gap-6 max-w-md italic">
           <div className="flex items-center gap-4 text-red-600">
             <AlertTriangle size={24} />
             <span className="font-black uppercase tracking-widest text-sm">Connection Error</span>
           </div>
           <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed tracking-wide">
             The system was unable to establish a secure data uplink with the primary ticker stream. Potential connectivity issues detected.
           </p>
           <button onClick={() => fetchMarketData(true)} className="mt-4 py-4 bg-blue-600 text-white font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-blue-700 transition-all shadow-sm">
             Retry Synchronization &gt;&gt;
           </button>
        </div>
      </div>
    );
  }

  const { indices, market_intelligence, news } = report;
  const nifty = indices['NIFTY 50']?.snapshot;
  const sensex = indices['SENSEX']?.snapshot;

  const displayNews = news;
  const filteredNews = displayNews?.filter((item: NewsItem) =>
    selectedDomains.length === 0 || selectedDomains.some(domain =>
      item.title.toLowerCase().includes(domain.toLowerCase()) ||
      item.summary.toLowerCase().includes(domain.toLowerCase())
    )
  );

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 bg-[#f8fafc] font-sans custom-scrollbar relative">
      
      {/* Tactical Toast Notifications */}
      <div className="fixed top-24 right-8 z-[100] flex flex-col gap-3 w-96 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notif, idx) => (
            <motion.div
              key={notif.title + idx}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="bg-white border border-slate-200 p-6 shadow-xl pointer-events-auto relative overflow-hidden italic"
            >
              <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-600" />
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 bg-blue-600" />
                    <span className="text-[9px] uppercase tracking-widest text-blue-600 font-bold">Source: {notif.source}</span>
                  </div>
                  <a href={notif.link} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-900 font-bold hover:text-blue-600 transition leading-snug block uppercase tracking-tight">
                    {notif.title}
                  </a>
                </div>
                <button onClick={() => dismissNotification(idx)} className="text-slate-300 hover:text-red-600 shrink-0 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        
        {/* Core Indices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NIFTY 50 */}
          <div className="bg-white p-8 border border-slate-200 relative overflow-hidden group shadow-sm italic">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-20" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Primary Index</div>
                <h3 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 uppercase">Nifty 50</h3>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-black text-slate-700 font-sans tracking-tighter italic">₹{nifty?.close?.toLocaleString('en-IN') ?? '—'}</span>
                  <div className={`flex items-center gap-1 px-3 py-1 border font-bold text-[10px] uppercase ${nifty?.change_pct >= 0 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {nifty?.change_pct >= 0 ? '+' : ''}{nifty?.change_pct}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Trend Signal</div>
                <div className={`px-5 py-2 border font-bold text-[10px] tracking-widest uppercase ${indices['NIFTY 50']?.trend === 'BULLISH' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'}`}>
                  {indices['NIFTY 50']?.trend}
                </div>
              </div>
            </div>
          </div>

          {/* SENSEX */}
          <div className="bg-white p-8 border border-slate-200 relative overflow-hidden group shadow-sm italic">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-20" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Secondary Index</div>
                <h3 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 uppercase">Sensex</h3>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-black text-slate-700 font-sans tracking-tighter italic">₹{sensex?.close?.toLocaleString('en-IN') ?? '—'}</span>
                  <div className={`flex items-center gap-1 px-3 py-1 border font-bold text-[10px] uppercase ${sensex?.change_pct >= 0 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {sensex?.change_pct >= 0 ? '+' : ''}{sensex?.change_pct}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Momentum</div>
                <div className="text-3xl font-black text-slate-900 tracking-tighter font-sans underline decoration-blue-600/20 underline-offset-4">{indices['SENSEX']?.technical.rsi_14}<span className="text-[10px] text-slate-400 ml-2 font-bold uppercase tracking-widest">RSI (14)</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <div className="bg-white border border-slate-200 p-8 relative overflow-hidden flex items-center gap-10 shadow-sm italic">
          <div className="w-16 h-16 bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm shrink-0">
             <Brain size={32} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase font-bold tracking-widest text-blue-600 mb-3 flex items-center gap-4">
               Market Sentiment Report <div className="h-[1px] flex-1 bg-blue-100" />
            </div>
            <p className="text-slate-900 font-black text-lg leading-relaxed uppercase tracking-tight">
              "{market_intelligence.ai_insight || 'Aggregating consensus signals...'}"
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Intelligence Feed */}
          <div className="lg:col-span-8 flex flex-col space-y-8">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-4 italic overflow-hidden">
                 <div className="w-12 h-[1px] bg-blue-200" />
                 Market Intelligence
                 <div className="h-[1px] flex-1 bg-slate-100 ml-4" />
               </h3>
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Live Feed</span>
               </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 pr-4">
              {filteredNews && filteredNews.length > 0 ? (
                filteredNews.map((item: NewsItem, idx: number) => (
                  <motion.a 
                    key={item.title + idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="block p-8 bg-white border border-slate-200 hover:border-blue-600 transition-all group relative overflow-hidden shadow-sm hover:shadow-lg italic"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-50 border-r border-slate-100" />
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest px-3 py-1.5 border border-blue-100 bg-blue-50">{item.source}</span>
                        <div className="w-[1px] h-4 bg-slate-100" />
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2 font-sans">
                          <Clock size={12} className="opacity-50" />
                          {item.published ? new Date(item.published).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Active'}
                        </span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="px-3 py-1 border border-blue-600 text-blue-600 font-bold text-[8px] uppercase tracking-widest shadow-sm">Analysis Active &gt;&gt;</div>
                      </div>
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 mb-4 group-hover:text-blue-600 leading-tight uppercase tracking-tighter decoration-blue-600/10 transition-all">{item.title}</h4>
                    <p className="text-xs text-slate-500 font-bold line-clamp-3 leading-relaxed opacity-80 uppercase tracking-tight" dangerouslySetInnerHTML={{__html: item.summary}}></p>
                    
                    <div className="mt-8 flex items-center gap-6 pt-6 border-t border-slate-50">
                       <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 text-[8px] text-slate-400 font-bold uppercase tracking-widest border border-slate-100">
                         Process: 0.04s
                       </div>
                       <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-[8px] text-blue-600 font-bold uppercase tracking-widest border border-blue-100 shadow-sm">
                         Conviction: High
                       </div>
                    </div>
                  </motion.a>
                ))
              ) : (
                <div className="h-64 flex items-center justify-center border border-dashed border-slate-200 text-slate-300 font-black uppercase tracking-widest text-[10px] italic">
                   Awaiting Market Signals...
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Analytics */}
          <div className="lg:col-span-4 space-y-10 italic">
            {/* Sector Performance */}
            <div className="bg-white p-8 border border-slate-200 relative overflow-hidden shadow-sm">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                Sector Performance
                <div className="h-[1px] flex-1 bg-slate-50" />
              </h3>
              <div className="grid grid-cols-2 gap-px bg-slate-100 border border-slate-100 shadow-inner">
                {market_intelligence.sectors && Object.keys(market_intelligence.sectors).length > 0 ? (
                  Object.entries(market_intelligence.sectors).map(([sector, score]) => (
                    <div key={sector} className="bg-white p-5 border border-slate-50 hover:bg-slate-50 transition-all group/item">
                      <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-2 truncate">{sector}</div>
                      <div className="flex items-center justify-between">
                        <span className={`text-lg font-black tracking-tighter italic ${(score as number) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(score as number) >= 0 ? '+' : ''}{score as number}%
                        </span>
                        <div className={`w-0.5 h-4 ${(score as number) >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 bg-white p-8 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-t-2 border-blue-600 animate-spin" />
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Loading sector data...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Market Standouts Header */}
            <div className="flex items-center gap-4 px-2">
               <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap italic">Market Standouts</div>
               <div className="h-[1px] flex-1 bg-slate-100" />
            </div>

            {/* Top Gainers & Losers */}
            <div className="space-y-6">
              <div className="bg-white p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/5 -rotate-45 translate-x-4 -translate-y-4" />
                <h4 className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-8 flex items-center gap-3">
                  <TrendingUp size={14} /> Top Gainers
                </h4>
                <div className="space-y-5">
                  {market_intelligence.top_gainers && market_intelligence.top_gainers.length > 0 ? (
                    market_intelligence.top_gainers.slice(0, 5).map((stock) => (
                      <div key={stock.symbol} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 group transition-all">
                        <div>
                          <div className="text-sm font-black text-slate-900 tracking-tighter group-hover:text-green-600 transition-colors uppercase">{stock.symbol}</div>
                          <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 font-sans">Price: ₹{stock.price?.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-green-600 italic">+{stock.change_pct}%</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-t-2 border-green-400 animate-spin" />
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Scanning...</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-red-500/5 -rotate-45 translate-x-4 -translate-y-4" />
                <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-8 flex items-center gap-3">
                  <TrendingDown size={14} /> Top Losers
                </h4>
                <div className="space-y-5">
                  {market_intelligence.top_losers && market_intelligence.top_losers.length > 0 ? (
                    market_intelligence.top_losers.slice(0, 5).map((stock) => (
                      <div key={stock.symbol} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 group transition-all">
                        <div>
                          <div className="text-sm font-black text-slate-900 tracking-tighter group-hover:text-red-600 transition-colors uppercase">{stock.symbol}</div>
                          <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 font-sans">Price: ₹{stock.price?.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-red-600 italic">{stock.change_pct}%</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-t-2 border-red-400 animate-spin" />
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Scanning...</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
