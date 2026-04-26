import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  MonitorPlay,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Radar,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const VideoEngineView: React.FC = () => {
  const [scenes, setScenes]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [progress, setProgress]       = useState(0);

  // ── Fetch live scenes from backend ──────────────────────────────────────
  const fetchScenes = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    try {
      const res  = await fetch(`${API_BASE}/api/video/generate_scenes?_t=${Date.now()}`);
      const json = await res.json();
      if (json.status === 'success' && json.scenes?.length > 0) {
        setScenes(json.scenes);
        setCurrentScene(0);
        setProgress(0);
        setIsPlaying(false);
        setLastUpdated(new Date());
        setError(null);
      } else {
        if (isInitial) setError('No scene data returned from Market Wrap engine.');
      }
    } catch (e) {
      if (isInitial) setError('Could not reach the Market Wrap API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchScenes(true);
    // Auto-refresh every 5 minutes so daily data is always fresh
    const interval = setInterval(() => fetchScenes(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchScenes]);

  // ── Scene playback timer ──────────────────────────────────────────────
  const SCENE_DURATION = 4000; // ms per scene
  useEffect(() => {
    let interval: any;
    if (isPlaying && scenes.length > 0) {
      interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + (100 / (SCENE_DURATION / 100));
          if (next >= 100) {
            if (currentScene < scenes.length - 1) {
              setCurrentScene(s => s + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 100;
            }
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentScene, scenes.length]);

  const reset = () => { setCurrentScene(0); setProgress(0); setIsPlaying(false); };

  // ── Scene renderer ────────────────────────────────────────────────────
  const renderScene = (scene: any) => {
    switch (scene.visual_type) {

      case 'GRID_SCANLINE':
        return (
          <div className="text-center max-w-4xl px-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-6">{scene.subtitle}</div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight uppercase">
                {scene.narration_text}
              </h2>
            </motion.div>
          </div>
        );

      case 'INDEX_CHART_ZOOM':
        return (
          <div className="text-center space-y-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{scene.title?.replace(/_/g,' ')}</div>
              <div className="text-7xl font-black text-slate-900 tracking-tighter mb-4">₹{scene.value}</div>
              <div className={`inline-flex items-center gap-3 px-6 py-3 border text-2xl font-black uppercase ${
                scene.change?.startsWith('-') ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-600'
              }`}>
                {scene.change?.startsWith('-') ? <TrendingDown size={24}/> : <TrendingUp size={24}/>}
                {scene.change}
              </div>
              <p className="mt-8 text-sm text-slate-500 font-bold uppercase tracking-wide max-w-2xl mx-auto leading-relaxed">
                {scene.narration_text}
              </p>
            </motion.div>
          </div>
        );

      case 'RACE_CHART':
        return (
          <div className="w-full h-full flex flex-col justify-center gap-6 px-16">
            <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4 text-center border-b border-slate-200 pb-4">
              Sector Rotation Index
            </h2>
            {scene.sectors?.map((item: any, i: number) => {
              const pct   = Math.abs(item.value);
              const isPos = item.value >= 0;
              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    <span>{item.name}</span>
                    <span className={isPos ? 'text-green-600' : 'text-red-600'}>
                      {isPos ? '+' : ''}{item.value}%
                    </span>
                  </div>
                  <div className="h-4 bg-slate-100 border border-slate-200 shadow-inner p-[2px]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, pct * 10)}%` }}
                      transition={{ duration: 1.5, delay: i * 0.15 }}
                      className={`h-full shadow-md ${isPos ? 'bg-green-500' : 'bg-red-500'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'HUD_TARGET_LOCK':
        return (
          <div className="text-center space-y-8 px-16 max-w-3xl">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
              <div className="flex items-center justify-center gap-3 mb-6">
                <Radar size={20} className="text-blue-600" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Opportunity Radar Signal</span>
              </div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 uppercase">{scene.headline}</h2>
              <div className="inline-block px-6 py-2 bg-blue-50 border border-blue-200 text-blue-600 text-xl font-black uppercase tracking-widest">
                Est. Impact: {scene.impact}
              </div>
              <p className="mt-8 text-sm text-slate-500 font-bold uppercase tracking-wide leading-relaxed">
                {scene.narration_text}
              </p>
            </motion.div>
          </div>
        );

      case 'TERMINAL_FADE':
        return (
          <div className="text-center space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{scene.subtitle}</div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{scene.title?.replace(/_/g,' ')}</h2>
              <p className="mt-8 text-sm text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl mx-auto">
                {scene.narration_text}
              </p>
            </motion.div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <p className="text-slate-400 font-bold uppercase tracking-widest">{scene.narration_text}</p>
          </div>
        );
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f8fafc]">
        <div className="w-64 h-1 bg-slate-200 border border-slate-300 relative overflow-hidden mb-6 shadow-sm">
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-blue-600"
          />
        </div>
        <p className="font-bold uppercase tracking-[0.3em] text-[10px] text-blue-600 italic">
          Generating Daily Market Wrap...
        </p>
        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-2 italic">
          Fetching live NIFTY data + Opportunity Radar
        </p>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────
  if (error || scenes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="p-10 border border-slate-200 bg-white shadow-sm flex flex-col gap-6 max-w-md italic">
          <div className="flex items-center gap-4 text-red-600">
            <AlertTriangle size={24} />
            <span className="font-black uppercase tracking-widest text-sm">Market Wrap Unavailable</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed tracking-wide">
            {error || 'No scenes were generated. Ensure the backend is running and signals have been scanned.'}
          </p>
          <button
            onClick={() => { setError(null); fetchScenes(true); }}
            className="py-4 bg-blue-600 text-white font-bold uppercase tracking-[0.3em] text-[10px] hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-3"
          >
            <RefreshCw size={12} /> Retry Generation
          </button>
        </div>
      </div>
    );
  }

  const scene = scenes[currentScene];

  // ── Main view ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] font-sans relative custom-scrollbar z-10">
      <div className="max-w-6xl mx-auto p-12 space-y-12 relative z-10 italic">

        {/* Header */}
        <div className="bg-white border border-slate-200 p-10 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 opacity-20 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <MonitorPlay size={32} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Market Wrap</h1>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  <p className="text-[10px] uppercase tracking-widest font-black text-blue-600">
                    Live Daily Cinematic Intelligence — {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
                  </p>
                </div>
                {lastUpdated && (
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Data fetched: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchScenes(false)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-600 hover:text-blue-600 text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm disabled:opacity-40"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={reset}
                className="p-4 bg-white border border-slate-200 hover:border-blue-600 text-slate-400 hover:text-blue-600 transition-all shadow-sm group"
              >
                <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Visual Frame */}
        <div className="w-full aspect-video bg-white border border-slate-200 shadow-xl overflow-hidden relative group z-10">
          <div className="absolute inset-0 bg-slate-50">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.7 }}
                className="absolute inset-0 flex items-center justify-center p-16"
              >
                {renderScene(scene)}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Playback Controls */}
          <div className="absolute inset-x-8 bottom-8 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/90 backdrop-blur-md p-6 border border-slate-200 flex items-center gap-8 shadow-2xl">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-md transition-all"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>

              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black">
                  <span className="text-slate-400 uppercase tracking-widest">
                    Segment {String(currentScene + 1).padStart(2,'0')} — {scene.title?.replace(/_/g,' ')}
                  </span>
                  <span className="text-blue-600 uppercase tracking-widest">{Math.round(progress)}% Processed</span>
                </div>
                <div className="h-1.5 bg-slate-100 border border-slate-200 overflow-hidden">
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                    className="h-full bg-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                  {isPlaying ? 'Live' : 'Paused'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scene Selector */}
        <div className={`grid gap-6`} style={{ gridTemplateColumns: `repeat(${scenes.length}, 1fr)` }}>
          {scenes.map((sc: any, i: number) => (
            <button
              key={sc.id}
              onClick={() => { setCurrentScene(i); setProgress(0); setIsPlaying(true); }}
              className={`text-left p-6 transition-all border relative overflow-hidden shadow-sm italic ${
                currentScene === i
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-slate-200 hover:border-blue-600'
              }`}
            >
              <div className={`text-[9px] font-black uppercase tracking-widest mb-2 ${currentScene === i ? 'text-blue-100' : 'text-blue-600'}`}>
                Segment {String(i + 1).padStart(2,'0')}
              </div>
              <div className={`text-xs font-black mb-3 leading-tight tracking-tighter uppercase ${currentScene === i ? 'text-white' : 'text-slate-900'}`}>
                {sc.title?.replace(/_/g,' ')}
              </div>
              <div className={`flex items-center justify-between border-t pt-3 ${currentScene === i ? 'border-blue-500' : 'border-slate-50'}`}>
                <span className={`text-[8px] font-bold uppercase tracking-widest ${currentScene === i ? 'text-blue-200' : 'text-slate-300'}`}>
                  {sc.visual_type?.replace(/_/g,' ')}
                </span>
                {currentScene === i && isPlaying && <Activity size={10} className="text-white/50" />}
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};
