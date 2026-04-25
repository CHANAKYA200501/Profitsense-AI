import React, { useEffect } from 'react';
import { SignalFeed } from '../components/SignalFeed';
import { ChartPanel } from '../components/ChartPanel';
import { useStore } from '../store/useStore';
import { PortfolioView } from './PortfolioView';
import { BacktestView } from './BacktestView';
import { MarketView } from './MarketView';
import { AnalysisView } from './AnalysisView';
import { IntradayView } from './IntradayView';
import { ExpiryView } from './ExpiryView';
import { PredictionView } from './PredictionView';
import { BuySellView } from './BuySellView';
import { ChatWidget } from '../components/ChatWidget';
import { TradeAdvisorView } from './TradeAdvisorView';
import { OpportunityRadarView } from './OpportunityRadarView';
import { VideoEngineView } from './VideoEngineView';
import { AdminView } from './AdminView';
import { 
  LogOut, Radar, PlayCircle, Activity, Brain, Globe, Shield, 
  Zap, History, Target, Clock, ArrowRightLeft 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { 
    setConnected, addSignal, setSignals, signals, activeSymbol, activeView, 
    setActiveView, setActiveSymbol, user, logout 
  } = useStore();
  const activeSignal = signals.find(s => s.symbol === activeSymbol);

  const [sidebarWidth, setSidebarWidth] = React.useState(() => {
    const saved = localStorage.getItem('ps_sidebar_width');
    return saved ? parseInt(saved) : 288;
  });
  const [isResizing, setIsResizing] = React.useState(false);

  const startResizing = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.min(Math.max(200, e.clientX), 450);
      setSidebarWidth(newWidth);
      localStorage.setItem('ps_sidebar_width', newWidth.toString());
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = apiBase.replace(/^http/, 'ws') + '/ws/live';
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setConnected(true);
      console.log('Connected to ProfitSense AI Live Feed');
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'initial_state') {
           if (message.signals && Array.isArray(message.signals)) {
             setSignals(message.signals);
             setActiveSymbol(message.signals.length > 0 ? message.signals[0].symbol : null);
           }
        } else if (message.type === 'new_signal') {
           addSignal(message.data as any);
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('Disconnected from live feed');
    };

    return () => {
      ws.close();
    };
  }, [addSignal, setConnected, setActiveSymbol]);

  return (
    <div className="h-screen bg-[#f8fafc] text-[#0f172a] flex overflow-hidden font-sans relative">
      
      {/* Main Sidebar */}
      <aside 
        style={{ width: `${sidebarWidth}px` }}
        className="bg-white border-r border-slate-200 flex flex-col shrink-0 z-50 relative overflow-hidden"
      >
        {/* Branding */}
        <div className="p-8 pb-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 italic uppercase">
                ProfitSense AI
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-blue-600 italic">Institutional Intelligence</span>
              </div>
            </div>
          </div>

        {/* Navigation - Main */}
        <nav className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-8">
          <div>
            <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4 pl-2 italic">Main Terminal</h3>
            <div className="space-y-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: <Activity size={14}/> },
                { id: 'analysis', label: 'Intelligence', icon: <Brain size={14}/> },
                { id: 'market', label: 'Ecosystem', icon: <Globe size={14}/> },
                { id: 'portfolio', label: 'Portfolio', icon: <Shield size={14}/> },
                { id: 'opportunityradar', label: 'Radar', icon: <Radar size={14}/> },
                { id: 'admin', label: 'Admin', icon: <Shield size={14}/> },
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
                  className={`w-full flex items-center gap-4 px-4 py-3 text-xs font-bold transition-all border italic ${
                    activeView === item.id 
                      ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900 border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span className={activeView === item.id ? 'text-blue-600' : 'opacity-50'}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4 pl-2 italic">Analysis Labs</h3>
            <div className="space-y-1">
              {[
                { id: 'tradeadvisor', label: 'Trade Advisor', icon: <Target size={14}/> },
                { id: 'prediction', label: 'AI Prediction', icon: <Brain size={14}/> },
                { id: 'backtest', label: 'Backtest Lab', icon: <History size={14}/> },
                { id: 'intraday', label: 'Intraday IQ', icon: <Zap size={14}/> },
                { id: 'expiry', label: 'Expiry Pulse', icon: <Clock size={14}/> },
                { id: 'videoengine', label: 'Market Wrap', icon: <PlayCircle size={14}/> },
                { id: 'buysell', label: 'Execution', icon: <ArrowRightLeft size={14}/> },
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
                  className={`w-full flex items-center gap-4 px-4 py-2.5 text-[11px] font-bold transition-all border italic ${
                    activeView === item.id 
                      ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900 border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span className={activeView === item.id ? 'text-blue-600' : 'opacity-40'}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* User Status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={() => { window.history.pushState({}, '', '/portal/user'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            className="w-full mb-3 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm italic rounded-none border border-blue-700"
          >
            <Shield size={12} /> Security Portal
          </button>
          <div className="flex items-center justify-between p-3 border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-900 uppercase italic">{user?.name || user?.email?.split('@')[0]}</span>
              <span className="text-[8px] text-blue-600 font-bold tracking-widest uppercase italic">Live Session</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              title="End Session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Resizer Handle */}
        <div 
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-600/10 active:bg-blue-600/20 transition-colors z-[60]"
        />
      </aside>

      {/* Main Command Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Status Header */}
        <header className="h-10 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-40">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-[9px] text-green-600 font-bold tracking-widest uppercase italic">Market Status: Operational</span>
            </div>
            <div className="text-[9px] text-blue-600 font-bold tracking-widest flex items-center gap-2 uppercase italic">
               Network: 12ms
            </div>
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] italic">
            Target Sector: {activeSymbol || 'Analyzing...'} | Source: NSE_EXCHANGE
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {activeView === 'dashboard' && (
            <main className="h-full p-4 flex gap-4 overflow-hidden">
              {/* Left Column - Signal Feed */}
              <section className="w-[400px] flex flex-col h-full z-20">
                <SignalFeed />
              </section>
            
              {/* Right Column - Terminal Data */}
              <section className="flex-1 flex flex-col gap-4 h-full min-w-0">
                <div className="h-2/3 shrink-0 bg-white border border-slate-200 overflow-hidden shadow-sm">
                  <ChartPanel />
                </div>
                
                {/* Signal Intelligence */}
                <div className="flex-1 bg-white border border-slate-200 p-6 flex flex-col overflow-hidden shadow-sm">
                  <h2 className="text-[10px] uppercase tracking-[0.4em] font-bold text-blue-600 mb-6 flex items-center gap-3 italic">
                    <div className="w-2 h-2 bg-blue-600" />
                    Signal Intelligence
                  </h2>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {activeSignal ? (
                      <div className="space-y-6 flex-1 flex flex-col overflow-y-auto no-scrollbar">
                        
                        {/* Summary Block */}
                        <div className={`p-6 border italic ${
                          activeSignal.recommendation === 'BUY' ? 'bg-green-50 border-green-200' :
                          activeSignal.recommendation === 'SELL' ? 'bg-red-50 border-red-200' :
                          'bg-yellow-50 border-yellow-200'
                        } flex items-center justify-between shadow-sm`}>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Ticker:</span>
                              <span className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">{activeSignal.symbol}</span>
                            </div>
                            <div className={`text-4xl font-black tracking-tighter ${
                                activeSignal.recommendation === 'BUY' ? 'text-green-600' :
                                activeSignal.recommendation === 'SELL' ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {activeSignal.recommendation || 'NEUTRAL'}
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="text-5xl font-black text-slate-900 font-sans italic tracking-tighter">{activeSignal.confidence}<span className="text-sm opacity-40">%</span></div>
                             <div className="text-[9px] text-slate-400 font-bold tracking-[0.3em] uppercase">Probability</div>
                          </div>
                        </div>

                        {/* Market Context */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-4">
                              <h4 className="text-[9px] text-blue-600 font-bold uppercase tracking-widest border-b border-slate-100 pb-2 italic">Market Context</h4>
                              <p className="text-xs text-slate-500 leading-relaxed italic font-bold uppercase opacity-80">
                                "{activeSignal.narration?.what_happened}"
                              </p>
                              {activeSignal.trade_parameters && (
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                   <div className="p-4 bg-slate-50 border border-slate-100 shadow-sm">
                                      <div className="text-[8px] text-slate-400 font-bold uppercase mb-2 tracking-widest italic">Price Target</div>
                                      <div className="text-base font-black text-slate-900 italic tracking-tighter">₹{activeSignal.trade_parameters.target}</div>
                                   </div>
                                   <div className="p-4 bg-slate-50 border border-slate-100 shadow-sm">
                                      <div className="text-[8px] text-slate-400 font-bold uppercase mb-2 tracking-widest italic">Stop Loss</div>
                                      <div className="text-base font-black text-red-600 italic tracking-tighter">₹{activeSignal.trade_parameters.stop_loss}</div>
                                   </div>
                                </div>
                              )}
                           </div>
                           <div className="space-y-4">
                              <h4 className="text-[9px] text-blue-600 font-bold uppercase tracking-widest border-b border-slate-100 pb-2 italic">Strategy</h4>
                              <div className="p-5 bg-blue-50 border border-blue-100 shadow-sm relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-8 h-8 bg-blue-600/5 -rotate-45 translate-x-4 -translate-y-4" />
                                 <div className="text-[10px] text-blue-600 font-black mb-3 italic uppercase tracking-widest">Action Vector:</div>
                                 <div className="text-xs text-slate-600 leading-relaxed italic font-bold uppercase opacity-70">{activeSignal.narration?.suggested_action}</div>
                              </div>
                           </div>
                        </div>

                        <button
                          onClick={() => setActiveView('analysis')}
                          className="w-full py-4 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 text-[10px] font-bold uppercase tracking-[0.3em] transition-all shadow-sm italic"
                        >
                          View Full Analysis &gt;&gt;
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center bg-slate-50 border border-dashed border-slate-200">
                        <span className="text-[10px] text-slate-300 font-black uppercase tracking-[0.5em] italic">Awaiting Selection...</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </main>
          )}

          {activeView === 'portfolio' && <PortfolioView />}
          {activeView === 'backtest' && <BacktestView />}
          {activeView === 'market' && <MarketView />}
          {activeView === 'analysis' && <AnalysisView />}
          {activeView === 'intraday' && <IntradayView />}
          {activeView === 'expiry' && <ExpiryView />}
          {activeView === 'prediction' && <PredictionView />}
          {activeView === 'tradeadvisor' && <TradeAdvisorView />}
          {activeView === 'buysell' && <BuySellView />}
          {activeView === 'opportunityradar' && <OpportunityRadarView />}
          {activeView === 'videoengine' && <VideoEngineView />}
          {activeView === 'admin' && <AdminView />}
        </div>
        
        {/* Status Footer */}
        <footer className="h-8 bg-slate-900 border-t border-slate-800 flex items-center px-6 shrink-0 justify-between">
           <div className="flex items-center gap-4">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2 italic">
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> Platform Connectivity: Operational
              </span>
              <div className="h-4 w-px bg-slate-800" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">
                 Node: NSE_MAIN
              </span>
           </div>
           <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">
              v4.8.2-stable
           </div>
        </footer>
      </div>

      <ChatWidget />
    </div>
  );
};
