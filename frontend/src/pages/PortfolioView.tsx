import React, { useState, useEffect } from 'react';
import { PieChart, Activity, AlertTriangle, UploadCloud, ShieldAlert, Target, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

export const PortfolioView: React.FC = () => {
  const [xirr, setXirr] = useState<number>(18.4);
  const [isUploading, setIsUploading] = useState(false);
  const [overlapData, setOverlapData] = useState<any>(null);
  
  const [positions, setPositions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const [posRes, metRes] = await Promise.all([
          fetch('http://localhost:8000/api/trade/positions'),
          fetch('http://localhost:8000/api/trade/metrics')
        ]);
        const posData = await posRes.json();
        const metData = await metRes.json();
        if (posData.status === 'success') setPositions(posData.positions);
        if (metData.status === 'success') setMetrics(metData.metrics);
      } catch (e) {
        console.error("FAILED_TO_SYNC_VAULT_DATA_ARRAY");
      }
    };
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    
    setTimeout(() => {
      setXirr(24.2);
      setOverlapData([
        { fund1: 'Parag Parikh Flexi Cap', fund2: 'HDFC Index', overlap: 35.2 },
        { fund1: 'SBI Small Cap', fund2: 'Nippon Small Cap', overlap: 65.8, warning: true }
      ]);
      setIsUploading(false);
    }, 2000);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#f8fafc] font-sans relative custom-scrollbar z-10">

      <div className="max-w-7xl mx-auto p-12 space-y-12 relative z-10">
        
        {/* Portfolio Header */}
        <div className="bg-white border border-slate-200 p-10 relative overflow-hidden group shadow-sm italic">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 opacity-20" />
          
          <div className="flex justify-between items-center">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Portfolio Overview</h2>
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <p className="text-[10px] text-blue-600 uppercase tracking-widest font-bold">Risk Exposure Analysis</p>
              </div>
            </div>

            <div className="flex gap-8 items-center">
              <div className="bg-slate-50 border border-slate-100 p-5 flex flex-col items-center min-w-[160px] shadow-sm">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-2"><Activity size={12}/> Net Worth</span>
                <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{metrics?.total_portfolio_value?.toLocaleString() || '1,000,000'}</span>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 p-5 flex flex-col items-center min-w-[160px] shadow-sm">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-2 font-sans"><ShieldAlert size={12}/> Health</span>
                <span className={`text-2xl font-black tracking-tighter ${metrics?.overall_risk_score === 'HIGH' ? 'text-red-600' : 'text-green-600'}`}>{metrics?.overall_risk_score || 'STABLE'}</span>
              </div>
               
              <div className="text-right px-8 border-l border-slate-100">
                <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest mb-1">XIRR Return</p>
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
                   <span className={xirr >= 0 ? 'text-green-600' : 'text-red-600'}>{xirr}%</span>
                </h3>
              </div>
              
              <label className={`flex flex-col items-center px-8 py-4 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-blue-700 transition-all shadow-md ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="flex items-center gap-3">
                  <UploadCloud size={16} />
                  {isUploading ? 'Syncing...' : 'Sync Statement'}
                </span>
                <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleUpload} />
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Positions */}
          <div className="bg-white border border-slate-200 p-10 relative group overflow-hidden shadow-sm italic">
             <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 -rotate-45 translate-x-12 -translate-y-12" />
            <h3 className="text-sm font-bold text-slate-900 mb-8 flex items-center gap-4 uppercase tracking-[0.2em]">
              <BarChart3 size={20} className="text-blue-600" />
              Equity Holdings
            </h3>
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 no-scrollbar">
              {positions.length > 0 ? positions.map((holding) => (
                <div key={holding.id} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 hover:border-blue-600 transition-all relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200" />
                   <div className="flex flex-col gap-2 relative z-10">
                    <span className="text-xl font-black text-slate-900 italic tracking-tighter flex items-center gap-4 uppercase">
                      {holding.symbol} 
                      <span className={`text-[8px] px-2 py-1 font-bold tracking-widest border ${holding.direction === 'BUY' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'}`}>
                        {holding.direction}
                      </span>
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest font-sans">Units: {holding.quantity} | Cost: ₹{holding.entry_price}</span>
                  </div>
                  <div className="text-right relative z-10">
                    <div className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Potential: ₹{holding.target}</div>
                    <div className={`text-lg font-black tracking-tighter ${holding.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {holding.profit_loss >= 0 ? '+' : ''}₹{holding.profit_loss?.toFixed(2)}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-slate-400 py-24">
                   <Activity size={48} className="mx-auto mb-6 opacity-20" />
                   <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Live Positions</p>
                </div>
              )}
            </div>
          </div>

          {/* Redundancy Check */}
          <div className="bg-white border border-slate-200 p-10 relative group overflow-hidden shadow-sm italic">
             <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-600/5 rotate-12 translate-x-16 translate-y-16" />
            <h3 className="text-sm font-bold text-slate-900 mb-8 flex items-center gap-4 uppercase tracking-[0.2em]">
              <Target size={20} className="text-blue-600" />
              Exposure Audit
            </h3>
            
            {overlapData ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {overlapData.map((ol: any, i: number) => (
                  <div key={i} className={`p-6 border relative overflow-hidden ${ol.warning ? 'bg-red-50 border-red-600' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-slate-200 shadow-sm" />
                    <div className="flex justify-between items-center relative z-10">
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-900 font-bold uppercase tracking-widest">{ol.fund1}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-sans">::{ol.fund2}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={`text-2xl font-black tracking-tighter ${ol.warning ? 'text-red-600' : 'text-slate-900'}`}>
                          {ol.overlap}% OVERLAP
                        </span>
                        {ol.warning && (
                         <span className="flex items-center gap-2 text-[8px] text-red-600 font-bold uppercase tracking-widest mt-2">
                            <AlertTriangle size={12} /> High Overlap Detected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                <PieChart size={48} className="mb-6 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Analysis</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
