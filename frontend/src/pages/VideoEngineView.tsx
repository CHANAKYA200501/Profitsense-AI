import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw,
  Activity,
  MonitorPlay
} from 'lucide-react';

export const VideoEngineView: React.FC = () => {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const scenes = [
    { 
      id: 'intro', 
      title: 'Market Open: Volatility Spike', 
      type: 'TEXT', 
      duration: 3000,
      content: 'NSE structural momentum Shift detected in Private Banking sector.'
    },
    { 
      id: 'race', 
      title: 'Sector Rotation Velocity', 
      type: 'RACE_CHART', 
      duration: 5000,
      data: [
        { label: 'Banking', value: 85, color: '#2563eb' },
        { label: 'IT', value: 42, color: '#64748b' },
        { label: 'Auto', value: 68, color: '#334155' },
        { label: 'Pharma', value: 15, color: '#94a3b8' }
      ]
    },
    { 
      id: 'fii', 
      title: 'Institutional Flow Matrix', 
      type: 'FLOW', 
      duration: 4000,
      fii: 1240, 
      dii: 850 
    },
    { 
      id: 'picks', 
      title: 'AI Conviction Picks', 
      type: 'PICKS', 
      duration: 5000,
      picks: [
        { symbol: 'HDFCBANK', direction: 'BUY', pattern: 'Double Bottom' },
        { symbol: 'RELIANCE', direction: 'BUY', pattern: 'VCP Breakout' }
      ]
    }
  ];

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            if (currentScene < scenes.length - 1) {
              setCurrentScene(s => s + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 100;
            }
          }
          return prev + (100 / (scenes[currentScene].duration / 100));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentScene, scenes]);

  const reset = () => {
    setCurrentScene(0);
    setProgress(0);
    setIsPlaying(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] font-sans relative custom-scrollbar z-10">
      <div className="max-w-6xl mx-auto p-12 space-y-12 relative z-10 italic">
        
        {/* Visual Engine Header */}
        <div className="bg-white border border-slate-200 p-10 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 opacity-20 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <MonitorPlay size={32} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Visual Analysis Hub</h1>
                <div className="flex items-center gap-3 mt-4">
                   <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                   <p className="text-[10px] uppercase tracking-widest font-black text-blue-600">Cinematic Market Intelligence</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={reset}
                className="p-5 bg-white border border-slate-200 hover:border-blue-600 text-slate-400 hover:text-blue-600 transition-all shadow-sm group"
              >
                <RotateCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Visual Frame */}
        <div className="w-full aspect-video bg-white border border-slate-200 shadow-xl overflow-hidden relative group z-10 italic">
          <div className="absolute inset-0 bg-slate-50">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentScene}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 flex items-center justify-center p-20"
              >
                {scenes[currentScene].type === 'TEXT' && (
                  <div className="text-center max-w-4xl">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                      <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight uppercase underline decoration-blue-600/10 underline-offset-8 decoration-8">
                        {scenes[currentScene].content}
                      </h2>
                    </motion.div>
                  </div>
                )}

                {scenes[currentScene].type === 'RACE_CHART' && (
                  <div className="w-full h-full flex flex-col justify-center gap-8 px-20">
                    <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6 text-center border-b border-slate-200 pb-4">Sector Strength Index</h2>
                    {scenes[currentScene].data?.map((item: any, i: number) => (
                      <div key={item.label} className="space-y-3">
                        <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          <span>{item.label}</span>
                          <span className="text-blue-600">{item.value}% Power</span>
                        </div>
                        <div className="h-4 bg-slate-100 border border-slate-200 shadow-inner p-[2px]">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${item.value}%` }} 
                            transition={{ duration: 1.5, delay: i * 0.1 }}
                            className="h-full bg-blue-600 shadow-md" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {scenes[currentScene].type === 'FLOW' && (
                  <div className="flex items-center gap-32">
                    <div className="text-center group">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">FII Participation</div>
                      <div className="text-7xl font-black text-slate-900 tracking-tighter">
                        ₹{scenes[currentScene].fii}Cr
                      </div>
                    </div>
                    <div className="w-[1px] h-32 bg-slate-200" />
                    <div className="text-center group">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">DII Participation</div>
                      <div className="text-7xl font-black text-blue-600 tracking-tighter">
                        ₹{scenes[currentScene].dii}Cr
                      </div>
                    </div>
                  </div>
                )}

                {scenes[currentScene].type === 'PICKS' && (
                  <div className="grid grid-cols-2 gap-12 w-full px-20">
                    {scenes[currentScene].picks?.map((pick: any, i: number) => (
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        transition={{ delay: i * 0.2 }}
                        key={pick.symbol}
                        className="bg-white border border-slate-200 p-12 flex flex-col items-center justify-center relative overflow-hidden shadow-sm"
                      >
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600/20" />
                        <div className="text-5xl font-black text-slate-900 tracking-tighter mb-8 uppercase">{pick.symbol}</div>
                        <div className="px-6 py-2 bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                          Strategy: {pick.pattern}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Rendering Control Interface */}
          <div className="absolute inset-x-12 bottom-12 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/90 backdrop-blur-md p-8 border border-slate-200 flex items-center gap-12 shadow-2xl">
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="w-14 h-14 bg-blue-600 text-white flex items-center justify-center transition-all hover:bg-blue-700 shadow-md"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
              
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black">
                  <span className="text-slate-400 uppercase tracking-widest">Channel 0{currentScene + 1} — {scenes[currentScene].title}</span>
                  <span className="text-blue-600 uppercase tracking-widest">{Math.round(progress)}% Processed</span>
                </div>
                <div className="h-2 bg-slate-100 border border-slate-200 overflow-hidden p-[1px]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-blue-600 shadow-sm" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Live Analysis</span>
              </div>
            </div>
          </div>
        </div>

        {/* Segment Selector */}
        <div className="grid grid-cols-4 gap-8">
          {scenes.map((scene, i) => (
            <button
              key={scene.id}
              onClick={() => { setCurrentScene(i); setProgress(0); setIsPlaying(true); }}
              className={`text-left p-8 transition-all border relative overflow-hidden group shadow-sm italic ${
                currentScene === i 
                  ? 'bg-blue-600 border-blue-600' 
                  : 'bg-white border-slate-200 hover:border-blue-600'
              }`}
            >
              <div className={`text-[9px] font-black uppercase tracking-widest mb-3 ${currentScene === i ? 'text-blue-100' : 'text-blue-600'}`}>Segment 0{i + 1}</div>
              <div className={`text-sm font-black mb-4 leading-tight tracking-tighter uppercase ${currentScene === i ? 'text-white' : 'text-slate-900'}`}>{scene.title}</div>
              <div className={`flex items-center justify-between mt-6 border-t pt-4 ${currentScene === i ? 'border-blue-500' : 'border-slate-50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${currentScene === i ? 'text-blue-200' : 'text-slate-300'}`}>Analysis Narrative</span>
                {currentScene === i && isPlaying && <Activity size={12} className={currentScene === i ? 'text-white/40' : 'text-blue-600/40'} />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
