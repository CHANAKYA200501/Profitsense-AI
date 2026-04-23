import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { usePortalAuth } from '../store/usePortalAuth';
import { portalApi } from '../api/portalApi';
import { ShieldAlert, Eye, EyeOff, AlertTriangle, Zap, ArrowLeft } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState({ a: 0, b: 0 });
  const [locked, setLocked] = useState(false);
  const { setAuth } = usePortalAuth();
  const totpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ a, b });
    setCaptchaAnswer('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setError('');
    setLoading(true);

    if (showCaptcha) {
      if (parseInt(captchaAnswer) !== captchaQuestion.a + captchaQuestion.b) {
        setError('Incorrect CAPTCHA answer. Please try again.');
        generateCaptcha();
        setLoading(false);
        return;
      }
    }

    try {
      const result = await portalApi.adminLogin(email, password, totpCode);
      if (result.status === 'success') {
        setAuth(result.user, result.csrf_token, result.access_token);
        window.history.pushState({}, '', '/admin');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        
        if (attempts >= 5) {
          setLocked(true);
          setError('Account locked after 5 failed attempts. Please contact security.');
        } else if (attempts >= 3) {
          setShowCaptcha(true);
          generateCaptcha();
          setError(`Invalid credentials. ${5 - attempts} attempts remaining. Complete CAPTCHA to continue.`);
        } else {
          setError(result.detail?.detail || result.detail || 'Authentication failed. Please verify your credentials and 2FA code.');
        }
      }
    } catch {
      setError('Network synchronization error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    
    const newCode = totpCode.split('');
    newCode[index] = value;
    setTotpCode(newCode.join(''));
    
    if (value && index < 5) {
      totpRefs.current[index + 1]?.focus();
    }
  };

  const handleTotpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !totpCode[index] && index > 0) {
      totpRefs.current[index - 1]?.focus();
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
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white border border-slate-200 shadow-lg mb-8 relative">
               <div className="absolute inset-0 bg-blue-600/5 shadow-inner" />
               <ShieldAlert className="w-10 h-10 text-blue-600 relative z-10" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-3 text-center">ProfitSENSE</h1>
            <div className="flex items-center justify-center gap-3">
               <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
               <p className="text-[10px] text-blue-600 font-black">Admin Operations</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[9px] text-slate-400 font-black pl-1">Admin Hash</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={locked}
                className="w-full bg-slate-50 border border-slate-100 px-6 py-4 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-600 shadow-inner transition-all font-bold text-base tracking-wider disabled:opacity-50"
                placeholder="admin@profitsense.ai"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[9px] text-slate-400 font-black pl-1">Secure Protocol Key</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={locked}
                  className="w-full bg-slate-50 border border-slate-100 px-6 py-4 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-600 shadow-inner transition-all font-bold text-base tracking-wider pr-16 disabled:opacity-50"
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

            <div className="space-y-3">
              <label className="text-[9px] text-slate-400 font-black pl-1">Authenticator Sequence</label>
              <div className="flex gap-2 justify-between">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { totpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={totpCode[i] || ''}
                    onChange={(e) => handleTotpChange(i, e.target.value)}
                    onKeyDown={(e) => handleTotpKeyDown(i, e)}
                    disabled={locked}
                    className="w-[calc(100%/6-8px)] aspect-square bg-slate-50 border border-slate-100 text-center text-slate-900 text-xl font-black focus:outline-none focus:border-blue-600 transition-all disabled:opacity-50 shadow-inner"
                  />
                ))}
              </div>
            </div>

            {showCaptcha && !locked && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2">
                <label className="text-[9px] text-slate-400 font-black pl-1">Security Verification</label>
                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 border border-slate-200 px-5 py-4 text-slate-900 font-black shadow-inner w-24 text-center text-[12px]">
                    {captchaQuestion.a} + {captchaQuestion.b}
                  </div>
                  <input
                    type="text"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-100 px-6 py-4 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-600 shadow-inner transition-all font-bold text-base tracking-wider"
                    placeholder="ENTER SUM"
                  />
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 border border-red-100 p-5 flex items-center gap-4 text-red-600 text-sm font-black"
              >
                <div className="w-8 h-8 bg-white border border-red-100 flex items-center justify-center shrink-0 shadow-sm">
                   <AlertTriangle size={16} />
                </div>
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || locked || totpCode.length < 6}
              className={`w-full py-5 font-black text-sm transition-all flex items-center justify-center gap-4 shadow-md ${
                loading || locked || totpCode.length < 6
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]'
              }`}
            >
              {loading ? 'Verifying...' : locked ? 'ACCESS DENIED' : <><Zap size={16} /> Authorize Access</>}
            </button>
          </form>

          <div className="mt-12 text-center border-t border-slate-50 pt-10">
            <button 
              onClick={() => { window.history.pushState({}, '', '/login'); window.dispatchEvent(new PopStateEvent('popstate')); }}
              className="text-[9px] text-slate-300 hover:text-blue-600 font-black transition-all inline-flex items-center gap-2"
            >
              <ArrowLeft size={12} /> / RETURN TO USER HUB /
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
