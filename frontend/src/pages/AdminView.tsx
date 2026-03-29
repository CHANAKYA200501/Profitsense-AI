import React, { useState, useEffect } from 'react';
import { 
  Shield, Activity, Server, Database, Globe, 
  Cpu, AlertTriangle, Terminal as TerminalIcon,
  BarChart3, Zap
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const [uptime] = useState('99.98%');
  const [latency, setLatency] = useState(14);
  const [logs] = useState([
    { id: 1, time: '18:42:01', event: 'Connection Established', origin: 'Primary Node', status: 'SUCCESS' },
    { id: 2, time: '18:45:12', event: 'Pattern Scan Started', origin: 'Analytics Engine', status: 'SUCCESS' },
    { id: 3, time: '18:48:33', event: 'API Latency Check', origin: 'Market Provider', status: 'WARNING' },
    { id: 4, time: '19:01:05', event: 'Admin Session Started', origin: 'Auth Service', status: 'CRITICAL' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => Math.max(10, Math.min(45, prev + Math.floor(Math.random() * 5) - 2)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar relative z-10 bg-[#f8fafc]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-12 italic">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white border border-slate-200 flex items-center justify-center shadow-lg">
            <Shield className="text-blue-600" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Administration</h1>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-2">
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Status: Operational</span>
              <span className="flex items-center gap-2"><Globe size={12} className="opacity-40" /> Network: Secured</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-6">
          <div className="p-6 px-10 flex flex-col items-end bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600 opacity-20" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Network Latency</span>
            <span className={`text-3xl font-black ${latency > 35 ? 'text-yellow-600' : 'text-slate-900'}`}>{latency}ms</span>
          </div>
          <div className="p-6 px-10 flex flex-col items-end bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-600 opacity-20" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">System Uptime</span>
            <span className="text-3xl font-black text-blue-600">{uptime}</span>
          </div>
        </div>
      </div>

      {/* Main Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Module Health */}
        <div className="lg:col-span-2 space-y-10 italic">
          <div className="bg-white border border-slate-200 p-8 shadow-sm">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-10 flex items-center gap-4">
              <Activity size={14} /> Module Integrity Matrix
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              {[
                { label: 'Market Feed', status: 'ACTIVE', load: '12%', icon: <Globe size={20}/> },
                { label: 'Intelligence Engine', status: 'ACTIVE', load: '45%', icon: <Zap size={20}/> },
                { label: 'Vault Lockdown', status: 'SECURED', load: '02%', icon: <Shield size={20}/> },
                { label: 'AI Prediction', status: 'ACTIVE', load: '88%', icon: <Cpu size={20}/> },
                { label: 'Database Sync', status: 'SYNCED', load: '05%', icon: <Database size={20}/> },
                { label: 'Network Portal', status: 'STABLE', load: '22%', icon: <Server size={20}/> },
              ].map((module) => (
                <div key={module.label} className="p-6 bg-slate-50 border border-slate-100 hover:border-blue-600 transition-all group">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-slate-300 group-hover:text-blue-600 transition-colors">{module.icon}</span>
                    <span className="text-[8px] font-black text-blue-600 tracking-widest bg-blue-50 px-3 py-1 border border-blue-100 shadow-sm">{module.status}</span>
                  </div>
                  <div className="text-[10px] font-black text-slate-900 mb-1 uppercase tracking-tighter">{module.label}</div>
                  <div className="w-full h-1 bg-slate-200 overflow-hidden mt-3">
                    <div className="h-full bg-blue-600" style={{ width: module.load }} />
                  </div>
                  <div className="flex justify-between mt-3">
                    <span className="text-[8px] text-slate-400 font-bold uppercase">Load</span>
                    <span className="text-[8px] text-slate-900 font-black">{module.load}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Access Logs */}
          <div className="bg-slate-50 border border-slate-200 p-8 shadow-inner overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <TerminalIcon size={16} className="text-slate-200" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-4">
              Authentication & Security Logs
            </h2>
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-6 text-[10px] border-b border-white/50 pb-4 last:border-0 hover:bg-white/40 transition-all font-sans">
                  <span className="text-slate-300 font-bold w-20">[{log.time}]</span>
                  <span className="text-slate-900 font-black w-40 uppercase tracking-tighter">{log.event}</span>
                  <div className="flex-1 flex items-center justify-between px-6 border-l border-slate-200">
                    <span className="text-slate-400 uppercase font-bold text-[8px]">Origin: {log.origin}</span>
                    <span className={`font-black tracking-widest px-3 py-1 border shadow-sm ${
                      log.status === 'SUCCESS' ? 'text-green-600 bg-green-50 border-green-200' : 
                      log.status === 'WARNING' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 
                      'text-red-600 bg-red-50 border-red-200'
                    }`}>{log.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Security Analytics */}
        <div className="space-y-8 italic">
          <div className="bg-white border border-slate-200 p-8 shadow-sm">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-10 flex items-center gap-4">
              <BarChart3 size={14} /> Threat Intelligence
            </h2>
            
            <div className="space-y-10">
              <div className="flex flex-col items-center justify-center p-10 bg-slate-50 border border-slate-100 shadow-inner">
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-6xl font-black text-slate-900 tracking-tighter">94<span className="text-xl opacity-20">%</span></span>
                  <span className="text-[9px] text-blue-600 font-bold tracking-[0.3em] uppercase mt-2">Integrity Score</span>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Nodes</span>
                    <span className="text-2xl font-black text-slate-900">421</span>
                  </div>
                  <div className="h-1 bg-slate-100 w-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-[65%]" />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">API Velocity</span>
                    <span className="text-2xl font-black text-slate-900">12.5k</span>
                  </div>
                  <div className="h-1 bg-slate-100 w-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-[88%]" />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">L1 Cache Status</span>
                    <span className="text-2xl font-black text-slate-900">1.2 TB</span>
                  </div>
                  <div className="h-1 bg-slate-100 w-full overflow-hidden">
                    <div className="h-full bg-yellow-600 w-[78%]" />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-red-50 border border-red-200 flex gap-6 items-center shadow-md">
                <div className="w-12 h-12 bg-white border border-red-200 flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Security Exception Detected</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase leading-tight">Unauthorized Probe attempt detected from external node [45.12.8.2]. Integrity maintained.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
