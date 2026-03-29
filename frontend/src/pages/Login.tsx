import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Shield, Eye, EyeOff, Zap, AlertTriangle, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useStore(state => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuth(data.user, data.token);
      } else {
        setError(data.detail || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center relative overflow-hidden font-sans italic">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-slate-200/20 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white border border-slate-200 p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600" />
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white border border-slate-200 shadow-lg mb-8 relative">
               <div className="absolute inset-0 bg-blue-600/5 shadow-inner" />
               <Shield className="w-10 h-10 text-blue-600 relative z-10" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-3 text-center">ProfitSENSE</h1>
            <div className="flex items-center justify-center gap-3">
               <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
               <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.3em]">Institutional Hub v4.0</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest pl-1">Identification Hash</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 px-6 py-4 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-600 shadow-inner transition-all font-bold text-[11px] uppercase tracking-wider"
                placeholder="Member Identification"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest pl-1">Secure Protocol Key</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-6 py-4 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-600 shadow-inner transition-all font-bold text-[11px] uppercase tracking-wider pr-16"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 border border-red-100 p-5 flex items-center gap-4 text-red-600 text-[10px] font-black uppercase tracking-widest"
              >
                <div className="w-8 h-8 bg-white border border-red-100 flex items-center justify-center shrink-0 shadow-sm">
                   <AlertTriangle size={16} />
                </div>
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-5 font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 shadow-md ${
                loading
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]'
              }`}
            >
              {loading ? 'Verifying...' : <><Zap size={16} /> Establish Link</>}
            </button>
          </form>

          <div className="mt-12 flex flex-col gap-6 items-center border-t border-slate-50 pt-10">
            <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
              New Intelligence Node?{' '}
              <a 
                href="/register" 
                onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/register'); window.dispatchEvent(new PopStateEvent('popstate')); }} 
                className="text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-2"
              >
                Establish Profile <ArrowRight size={12} />
              </a>
            </p>
            
            <button 
              onClick={() => { window.history.pushState({}, '', '/admin/login'); window.dispatchEvent(new PopStateEvent('popstate')); }}
              className="text-[9px] text-slate-200 hover:text-slate-400 font-black uppercase tracking-[0.5em] transition-all"
            >
               / ADMINISTRATIVE_ACCESS_ENTRY /
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
