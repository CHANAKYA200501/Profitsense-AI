import React from 'react';
import { Beaker, History, Zap, ChevronRight } from 'lucide-react';

export const BacktestView: React.FC = () => {
  return (
    <main className="flex-1 p-10 flex flex-col overflow-hidden min-h-0 space-y-12 bg-[#f8fafc] font-sans relative">
      <div className="flex justify-between items-center z-20 relative italic">
        <div className="flex items-center gap-8">
          <div className="w-16 h-16 bg-white border border-slate-200 flex items-center justify-center shadow-lg relative overflow-hidden">
             <div className="absolute inset-0 bg-blue-600/5 shadow-inner" />
             <Beaker size={32} className="text-blue-600 relative z-10" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Simulation Lab</h2>
            <div className="flex items-center gap-3 mt-3">
               <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
               <p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Strategic Backtesting Active</p>
            </div>
          </div>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-md flex items-center gap-4">
          Initialize Strategy &gt;&gt;
        </button>
      </div>

      {/* Main Console */}
      <div className="flex-1 bg-white border border-slate-200 flex items-center justify-center p-20 relative overflow-hidden group z-10 italic shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-full bg-blue-600/5 skew-x-[45deg] translate-x-32" />
        <div className="absolute bottom-0 left-0 w-64 h-full bg-blue-600/5 skew-x-[45deg] -translate-x-32" />
        
        <div className="relative z-10 text-center max-w-2xl space-y-12">
          <div className="w-32 h-32 mx-auto bg-white border border-slate-200 flex items-center justify-center mb-0 shadow-lg relative overflow-hidden group-hover:border-blue-600 transition-colors duration-700">
            <div className="absolute inset-0 bg-blue-600/5 shadow-inner" />
            <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600 opacity-20" />
            <Zap size={64} className="text-slate-100 group-hover:text-blue-600 transition-all duration-700" />
          </div>
          
          <div className="space-y-6">
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Simulation Core Standby</h3>
            <p className="text-slate-400 leading-relaxed text-[10px] font-bold uppercase tracking-widest">
              The Simulation Lab allows you to validate multi-agent strategies against historical datasets spanning 15 years within the NSE universe. High-fidelity backtesting ensures pattern integrity before live deployment.
            </p>
            <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Simulation Parameters</p>
          </div>
          
          <div className="pt-10 flex justify-center space-x-8">
             <button className="px-10 py-5 bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:text-slate-900 hover:border-blue-600 transition-all flex items-center gap-4 shadow-sm">
               <History size={16} /> Saved Results
             </button>
             <button className="px-10 py-5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-blue-700 transition-all flex items-center gap-4 shadow-md">
               Activate Engine <ChevronRight size={16} />
             </button>
          </div>
        </div>
      </div>
    </main>
  );
};
