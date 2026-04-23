import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, Zap, AlertTriangle, Shield, Loader } from 'lucide-react';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Timeout mechanism: if server doesn't respond in 10s, fail gracefully
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          window.history.pushState({}, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }, 2000);
      } else {
        setError(data.detail || 'Registration failed.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Server timeout. The backend might be starting or unresponsive. Please try again or check the server status.');
      } else {
        setError('Could not connect to the server. Ensure the backend is running at port 8000.');
      }
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center relative overflow-hidden font-sans italic">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-slate-200/20 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white border border-slate-200 p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600" />

          {success && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-20 bg-white flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="w-20 h-20 bg-white border border-slate-200 shadow-lg flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-green-600/5 shadow-inner" />
                <Zap className="w-10 h-10 text-green-600 relative z-10" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Registration Successful</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Intelligence node established. Synchronizing session parameters...</p>
            </motion.div>
          )}

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white border border-slate-200 shadow-lg mb-8 relative">
               <div className="absolute inset-0 bg-blue-600/5 shadow-inner" />
               <UserPlus className="w-10 h-10 text-blue-600 relative z-10" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-3">Establish Profile</h1>
            <div className="flex items-center justify-center gap-3">
               <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
               <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.3em]">Join the Intelligence Network</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest pl-1">Primary Email Node</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 px-6 py-4 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-600 shadow-inner transition-all font-bold text-[11px] uppercase tracking-wider"
                placeholder="Identification Email"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest pl-1">Access Protocol Key</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 px-6 py-4 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-600 shadow-inner transition-all font-bold text-[11px] uppercase tracking-wider pr-16"
                  placeholder="Min. 6 Characters"
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
                <span className="flex-1">{error}</span>
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
              {loading ? <><Loader className="w-4 h-4 animate-spin" /> Initializing Node...</> : 'Initiate Registration'}
            </button>
          </form>

          <div className="mt-12 pt-10 border-t border-slate-50 text-center">
            <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
              Existing Intelligence Node?{' '}
              <a 
                href="/login" 
                onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/login'); window.dispatchEvent(new PopStateEvent('popstate')); }} 
                className="text-blue-600 font-bold hover:text-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Shield size={12} /> Portal Entrance
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
