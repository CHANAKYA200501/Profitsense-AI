import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Target,
  BarChart3,
  Zap,
} from 'lucide-react';

interface OIRow {
  strike: number;
  call_oi: number;
  put_oi: number;
  call_change: number;
  put_change: number;
}

interface ExpiryData {
  nifty_ltp: number;
  expiry_date: string;
  expiry_day: string;
  hours_remaining: number;
  pcr: number;
  max_pain: number;
  total_call_oi: number;
  total_put_oi: number;
  oi_data: OIRow[];
  sentiment: string;
}

export const ExpiryView: React.FC = () => {
  const [data, setData] = useState<ExpiryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpiry = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/market/expiry');
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      } else {
        setError(json.error || 'Failed to sync expiry data');
      }
    } catch {
      setError('Connection to expiry data feed failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpiry();
    const timer = setInterval(fetchExpiry, 60000);
    return () => clearInterval(timer);
  }, [fetchExpiry]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] font-sans relative overflow-hidden">
        <div className="w-16 h-16 border-t-2 border-blue-600 animate-spin mb-8" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Scanning Expiry Data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] font-sans text-red-600 p-20 space-y-8">
        <Target size={48} className="opacity-20" />
        <div className="text-center">
           <h3 className="text-xl font-black uppercase tracking-widest mb-4 italic">Connection Error</h3>
           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">{error}</p>
        </div>
      </div>
    );
  }

  const maxOI = Math.max(...data.oi_data.map((r) => Math.max(r.call_oi, r.put_oi)));
  const days = Math.floor(data.hours_remaining / 24);
  const hours = Math.floor(data.hours_remaining % 24);
  const minutes = Math.round((data.hours_remaining % 1) * 60);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] font-sans relative custom-scrollbar z-10">

      <div className="max-w-6xl mx-auto p-12 space-y-12 relative z-10">
        {/* Header - Expiry Analysis */}
        <div className="hacker-panel bg-white border border-slate-200 p-10 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 opacity-10 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 bg-white border-2 border-blue-600 flex items-center justify-center shadow-sm">
                <Zap size={32} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                  {data.expiry_day} Expiry Analysis
                </h2>
                <div className="flex items-center gap-3 mt-4">
                   <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                   <p className="text-[10px] uppercase tracking-widest font-bold text-blue-600">Data Sync: {data.expiry_date}</p>
                </div>
              </div>
            </div>

            {/* Time Remaining */}
            <div className="flex items-center gap-6">
              <Clock size={20} className="text-slate-400" />
              <div className="flex gap-3">
                {days > 0 && (
                  <div className="bg-slate-50 border border-slate-100 px-4 py-3 text-center min-w-[70px]">
                    <div className="text-2xl font-black text-slate-900 italic">{days}</div>
                    <div className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">DAYS</div>
                  </div>
                )}
                <div className="bg-slate-50 border border-slate-100 px-4 py-3 text-center min-w-[70px]">
                  <div className="text-2xl font-black text-slate-900 italic">{hours}</div>
                  <div className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">HRS</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 px-4 py-3 text-center min-w-[70px]">
                  <div className="text-2xl font-black text-slate-900 italic">{minutes}</div>
                  <div className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">MIN</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Row - Telemetry Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 p-6 shadow-sm">
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-3 italic"><Activity size={12} className="text-blue-600" /> Market Price</div>
            <div className="text-2xl font-black text-slate-900 italic tracking-tighter">{data.nifty_ltp.toLocaleString('en-IN')}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
            className="bg-white border border-slate-200 p-6 shadow-sm">
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-3 italic"><Shield size={12} className="text-blue-600" /> Sentiment (PCR)</div>
            <div className={`text-2xl font-black italic tracking-tighter ${data.pcr > 1.2 ? 'text-green-600' : data.pcr < 0.8 ? 'text-red-600' : 'text-slate-900'}`}>
              {data.pcr}
            </div>
            <div className={`text-[9px] font-bold mt-3 italic uppercase tracking-widest ${data.sentiment === 'BULLISH' ? 'text-green-600' : data.sentiment === 'BEARISH' ? 'text-red-600' : 'text-slate-400'}`}>
              Signal: {data.sentiment}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="bg-white border border-slate-200 p-6 shadow-sm">
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-3 italic"><Target size={12} className="text-blue-600" /> Max Pain Index</div>
            <div className="text-2xl font-black text-slate-900 italic tracking-tighter">{data.max_pain.toLocaleString('en-IN')}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
            className="bg-white border border-slate-200 p-6 shadow-sm">
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-3 italic"><TrendingDown size={12} className="text-red-600" /> Total Calls</div>
            <div className="text-2xl font-black text-red-600 italic tracking-tighter">{(data.total_call_oi / 1e6).toFixed(1)}M</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="bg-white border border-slate-200 p-6 shadow-sm">
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-3 italic"><TrendingUp size={12} className="text-green-600" /> Total Puts</div>
            <div className="text-2xl font-black text-green-600 italic tracking-tighter">{(data.total_put_oi / 1e6).toFixed(1)}M</div>
          </motion.div>
        </div>

        {/* OI_SIGNAL_MATRIX */}
        <div className="hacker-panel bg-white border border-slate-200 p-10 relative group shadow-sm">
          <div className="absolute top-0 right-0 w-1 h-full bg-slate-100 group-hover:bg-blue-600 transition-all" />
          <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-12 flex items-center gap-6 italic">
            <BarChart3 size={18} className="text-blue-600" /> 
            Open Interest Matrix
          </h3>

          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_1fr] gap-10 text-[9px] text-slate-400 uppercase tracking-widest font-bold px-4 mb-6 italic">
              <div className="text-right">Call Resistance</div>
              <div className="text-center">Strike Price</div>
              <div className="text-left">Put Support</div>
            </div>

            {data.oi_data.map((row) => {
              const callWidth = (row.call_oi / maxOI) * 100;
              const putWidth = (row.put_oi / maxOI) * 100;
              const isATM = row.strike === Math.round(data.nifty_ltp / 50) * 50;

              return (
                 <div
                  key={row.strike}
                  className={`grid grid-cols-[1fr_120px_1fr] gap-10 items-center px-6 py-4 transition-all relative border ${
                    isATM ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'
                  }`}
                >
                  {/* Call OI Bar (right-aligned) */}
                   <div className="flex items-center justify-end gap-6 h-4">
                    <span className="text-[10px] text-slate-400 font-bold italic tracking-tighter w-20 text-right">
                      {(row.call_oi / 1000).toFixed(0)}K
                    </span>
                    <div className="w-full bg-slate-50 h-3 overflow-hidden border border-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${callWidth}%` }}
                        className="h-full bg-red-400 float-right transition-all"
                      />
                    </div>
                  </div>

                  {/* Strike Price */}
                   <div className={`text-center text-lg font-black italic tracking-tighter ${isATM ? 'text-slate-900' : 'text-slate-300'}`}>
                    {row.strike}
                    {isATM && (
                       <motion.div 
                         initial={{ opacity: 0.5 }}
                         animate={{ opacity: [0.5, 1, 0.5] }}
                         transition={{ repeat: Infinity, duration: 2 }}
                         className="text-[8px] text-blue-600 uppercase font-bold tracking-widest"
                       >
                         At The Money
                       </motion.div>
                    )}
                  </div>

                  {/* Put OI Bar (left-aligned) */}
                   <div className="flex items-center gap-6 h-4">
                    <div className="w-full bg-slate-50 h-3 overflow-hidden border border-slate-100">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${putWidth}%` }}
                        className="h-full bg-green-400 transition-all"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold italic tracking-tighter w-20">
                      {(row.put_oi / 1000).toFixed(0)}K
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

         {/* Simple Disclaimer */}
        <div className="bg-white p-6 border border-slate-200 shadow-sm">
           <p className="text-[9px] text-slate-400 font-bold flex items-center justify-center gap-6 italic overflow-hidden whitespace-nowrap">
              <span className="text-blue-600 font-bold tracking-widest uppercase shrink-0">OI Analysis Protocol</span>
              <span className="uppercase tracking-widest">Open Interest data is for analysis purposes only. Source: Primary market exchange feeds. Consult a financial advisor for risk management.</span>
           </p>
        </div>
      </div>
    </div>
  );
};
