import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, 
  TrendingUp, 
  Users, 
  Zap, 
  ArrowUpRight, 
  Clock,
  ShieldAlert,
  Building2
} from 'lucide-react';

interface RadarAlert {
  id: string;
  symbol: string;
  type: string;
  label: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  headline: string;
  insight: string;
  impact_est: string;
  timestamp: string;
}

export const OpportunityRadarView: React.FC = () => {
  const [alerts, setAlerts] = useState<RadarAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/radar/');
      const data = await res.json();
      if (data.status === 'success') {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Failed to fetch radar alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); 
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INSIDER_BUYING': return <Users size={16} />;
      case 'MANAGEMENT_SHIFT': return <Zap size={16} />;
      case 'BLOCK_DEAL': return <Building2 size={16} />;
      default: return <TrendingUp size={16} />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative bg-[#f8fafc] font-sans">
      
      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-10 border-b border-slate-200 relative overflow-hidden italic">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm relative group overflow-hidden">
              <div className="absolute inset-0 bg-blue-600/5 shadow-inner" />
              <Radar className="w-12 h-12 relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                 <span className="text-[10px] text-blue-600 uppercase tracking-widest font-bold">Market Scanner Active</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Market Radar</h1>
            </div>
          </div>
          <button 
            onClick={fetchAlerts}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-[10px] font-bold text-white uppercase tracking-[0.2em] transition-all shadow-md flex items-center gap-4 group"
          >
            <Clock size={16} /> Sync Radar
          </button>
        </div>

        {/* Core Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-10 border border-slate-200 bg-white hover:border-blue-600 transition-all group relative overflow-hidden shadow-sm italic">
            <ShieldAlert className="text-blue-600 mb-6 opacity-40" size={32} />
            <h3 className="text-slate-900 font-black text-[10px] mb-4 uppercase tracking-widest">Regulatory Analytics</h3>
            <p className="text-slate-400 text-[9px] leading-relaxed font-bold uppercase opacity-80">Scanning regulatory filings for management changes and capital movements.</p>
          </div>
          <div className="p-10 border border-slate-200 bg-white hover:border-blue-600 transition-all group relative overflow-hidden shadow-sm italic">
            <Users className="text-blue-600 mb-6 opacity-40" size={32} />
            <h3 className="text-slate-900 font-black text-[10px] mb-4 uppercase tracking-widest">Insider Integrity</h3>
            <p className="text-slate-400 text-[9px] leading-relaxed font-bold uppercase opacity-80">Monitoring promoter and investor trade patterns for consensus detection.</p>
          </div>
          <div className="p-10 border border-slate-200 bg-white hover:border-blue-600 transition-all group relative overflow-hidden shadow-sm italic">
            <ArrowUpRight className="text-blue-600 mb-6 opacity-40" size={32} />
            <h3 className="text-slate-900 font-black text-[10px] mb-4 uppercase tracking-widest">Signal Patterns</h3>
            <p className="text-slate-400 text-[9px] leading-relaxed font-bold uppercase opacity-80">Identifying high-probability signals indicative of institutional participation.</p>
          </div>
        </div>

        {/* Alerts Matrix Feed */}
        <div className="space-y-10 italic">
          <div className="flex items-center gap-6">
            <h2 className="text-[10px] uppercase tracking-widest text-blue-600 font-bold flex items-center gap-4">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              Intelligence Feed
            </h2>
            <div className="h-[1px] flex-1 bg-slate-100" />
          </div>
          
          <div className="grid grid-cols-1 gap-8 pr-4">
            <AnimatePresence mode="popLayout">
               {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-8">
                  <div className="w-16 h-1 bg-slate-100 relative overflow-hidden shadow-sm">
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-blue-600"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Awaiting Radar Delivery...</p>
                </div>
              ) : (
                alerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white border border-slate-200 hover:border-blue-600 p-10 transition-all relative overflow-hidden group shadow-sm hover:shadow-lg"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-50 border-r border-slate-100" />
                    
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex gap-12">
                        <div className="shrink-0 flex flex-col items-center gap-6">
                          <div className="text-3xl font-black text-slate-900 bg-slate-50 w-24 h-24 flex items-center justify-center border border-slate-100 shadow-sm transition-all italic">
                            {alert.symbol.substring(0, 3)}
                          </div>
                          <span className={`text-[9px] font-black px-4 py-2 border uppercase tracking-widest ${getSeverityStyle(alert.severity)}`}>
                            {alert.severity}
                          </span>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="flex items-center gap-6">
                            <span className="text-5xl font-black text-slate-900 tracking-tighter uppercase transition-colors">{alert.symbol}</span>
                            <div className="w-[1px] h-6 bg-slate-100 rotate-12" />
                            <span className="flex items-center gap-3 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                              {getTypeIcon(alert.type)} {alert.label}
                            </span>
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 max-w-3xl leading-tight uppercase tracking-tighter">{alert.headline}</h3>
                          <p className="text-slate-500 text-xs max-w-3xl leading-relaxed font-bold uppercase opacity-70 underline decoration-slate-100 underline-offset-4">{alert.insight}</p>
                          
                          <div className="pt-8 flex items-center gap-8">
                            <div className="px-5 py-2 border border-slate-100 bg-slate-50 text-[8px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                              REF: {alert.id.substring(0, 12)}
                            </div>
                            <div className="px-5 py-2 border border-green-600 bg-green-50 text-[8px] font-bold text-green-600 uppercase tracking-widest shadow-sm">
                              Alpha Confidence: {alert.impact_est}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col justify-between items-end h-full min-h-[160px]">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Analysis Time</div>
                          <div className="text-xl text-slate-900 font-sans font-black italic">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                        </div>
                        <button className="w-16 h-16 bg-white border border-slate-200 hover:border-blue-600 hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm group/btn">
                          <ArrowUpRight size={28} className="group-hover/btn:scale-125 transition-all" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Simple Disclaimer */}
        <div className="pt-16 border-t border-slate-200 flex items-start gap-6 opacity-60 group hover:opacity-100 transition-opacity">
          <ShieldAlert size={20} className="text-slate-400 shrink-0 mt-1" />
          <p className="text-[9px] text-slate-400 leading-relaxed uppercase tracking-widest font-bold max-w-4xl italic">
            Disclaimer: The Opportunity Radar uses AI to scan market filings for structural shifts. These signals are intended for informational purposes and should not be considered as direct investment advice.
          </p>
        </div>
      </div>
    </div>
  );
};
