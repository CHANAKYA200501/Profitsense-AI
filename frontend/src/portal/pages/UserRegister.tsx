import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { portalApi } from '../api/portalApi';
import { usePortalAuth } from '../store/usePortalAuth';
import { UserPlus, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Check, ChevronDown } from 'lucide-react';

function getPasswordStrength(p: string): { score: number; label: string; color: string } {
  let score = 0;
  if (p.length >= 8) score += 20;
  if (p.length >= 12) score += 10;
  if (/[a-z]/.test(p)) score += 15;
  if (/[A-Z]/.test(p)) score += 15;
  if (/\d/.test(p)) score += 15;
  if (/[^a-zA-Z0-9]/.test(p)) score += 15;
  if (p.length >= 16) score += 10;
  score = Math.min(100, score);
  if (score < 30) return { score, label: 'Weak', color: '#ef4444' };
  if (score < 60) return { score, label: 'Fair', color: '#f59e0b' };
  if (score < 80) return { score, label: 'Good', color: '#10b981' };
  return { score, label: 'Strong', color: '#06b6d4' };
}

export const UserRegister: React.FC = () => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { setAuth } = usePortalAuth();

  // Step 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [ageError, setAgeError] = useState('');

  // Step 2
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);

  // Step 4
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('passport');

  const passwordStrength = getPasswordStrength(password);

  const validateAge = useCallback((dobStr: string) => {
    if (!dobStr) return;
    const birthDate = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      setAgeError('You must be at least 18 years old to register.');
    } else {
      setAgeError('');
    }
  }, []);

  useEffect(() => { validateAge(dob); }, [dob, validateAge]);

  const handleTermsScroll = () => {
    if (!termsRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = termsRef.current;
    if (scrollHeight - scrollTop - clientHeight < 20) {
      setTermsScrolled(true);
    }
  };

  const canProceedStep1 = name.length >= 2 && email.includes('@') && dob && !ageError;
  const canProceedStep2 = password.length >= 8 && password === confirmPassword && passwordStrength.score >= 30;
  const canProceedStep3 = termsScrolled && termsAccepted;

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await portalApi.register({
        name,
        email,
        dob,
        password,
        confirm_password: confirmPassword,
        terms_accepted: termsAccepted,
      });

      if (result.status === 'success') {
        if (kycFile) {
          const formData = new FormData();
          formData.append('file', kycFile);
          formData.append('document_type', docType);
          formData.append('full_name', name);

          const loginResult = await portalApi.login(email, password);
          if (loginResult.status === 'success') {
            setAuth(loginResult.user, loginResult.csrf_token, loginResult.access_token);
            await portalApi.submitKyc(formData);
          }
        }
        setSuccess(true);
      } else {
        setError(result.detail || 'Registration failed');
      }
    } catch {
      setError('Connection failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] italic flex items-center justify-center relative overflow-hidden font-sans text-slate-900">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-slate-200/20 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg mx-4 my-8"
      >
        <div className="bg-white backdrop-blur-2xl border border-slate-100 rounded-3xl p-8 sm:p-10 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-50" />
          
          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-emerald-500/30 shadow-inner mb-6 relative overflow-hidden mx-auto">
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-50" />
                <CheckCircle2 className="w-10 h-10 text-emerald-400 relative z-10 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              </div>
              <h2 className="text-3xl font-semibold text-slate-900 font-black tracking-tight mb-4">Registration Complete</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                {kycFile ? 'Your account has been created and your KYC documents have been submitted for review.' : 'Your account has been created successfully. You can complete KYC verification later in your profile.'}
              </p>
              <button
                onClick={() => { window.history.pushState({}, '', '/login'); window.dispatchEvent(new PopStateEvent('popstate')); }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-900 font-black font-medium transition-all shadow-md hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] flex justify-center items-center gap-2"
              >
                Go to Sign In <ArrowRight size={18} />
              </button>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 border border-slate-100 shadow-inner mb-5 relative overflow-hidden">
                   <div className="absolute inset-0 bg-blue-500/5 opacity-50" />
                   <UserPlus className="w-8 h-8 text-blue-600 relative z-10 shadow-sm" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 font-black tracking-tight mb-2">Create Account</h1>
                
                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mt-6 max-w-xs mx-auto">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center flex-1 last:flex-none">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        step === s ? 'bg-blue-600 text-slate-900 font-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' :
                        step > s ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                        'bg-slate-50 text-slate-500 font-bold border border-slate-100'
                      }`}>
                        {step > s ? <Check size={14} /> : s}
                      </div>
                      {s < 4 && <div className={`h-[2px] flex-1 mx-2 rounded-full ${step > s ? 'bg-indigo-500/50' : 'bg-slate-50'}`} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Content */}
              <div className="min-h-[280px]">
                <AnimatePresence mode="wait">
                  {/* Step 1: Personal Info */}
                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 ml-1">Full Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-slate-900 font-black placeholder-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all shadow-inner"
                          placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 ml-1">Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-slate-900 font-black placeholder-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all shadow-inner"
                          placeholder="you@company.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 ml-1">Date of Birth</label>
                        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().split('T')[0]}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all shadow-inner [color-scheme:dark]" />
                        {ageError && <p className="text-red-400 text-xs ml-1 mt-1">{ageError}</p>}
                      </div>
                      
                      <div className="pt-4">
                        <button onClick={() => setStep(2)} disabled={!canProceedStep1}
                          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-slate-900 font-black rounded-xl font-medium transition-all shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          Continue <ArrowRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Password */}
                  {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 ml-1">Create Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-slate-900 font-black placeholder-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all shadow-inner"
                          placeholder="Minimum 8 characters" />
                        
                        {password && (
                          <div className="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest text-[10px]">Strength</span>
                              <span className="text-xs font-medium" style={{ color: passwordStrength.color }}>
                                {passwordStrength.label}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden w-full">
                              <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${passwordStrength.score}%`, backgroundColor: passwordStrength.color }} />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 ml-1">Confirm Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-slate-900 font-black placeholder-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all shadow-inner"
                          placeholder="Re-enter password" />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button onClick={() => setStep(1)} className="px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-slate-900 font-black font-medium transition-all flex items-center justify-center">
                          <ArrowLeft size={18} />
                        </button>
                        <button onClick={() => setStep(3)} disabled={!canProceedStep2}
                          className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-slate-900 font-black rounded-xl font-medium transition-all shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          Continue <ArrowRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Terms */}
                  {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 ml-1">Terms of Service</label>
                        <div
                          ref={termsRef}
                          onScroll={handleTermsScroll}
                          className="h-48 overflow-y-auto bg-slate-50 border border-slate-100 rounded-xl p-5 text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-relaxed shadow-inner custom-scrollbar"
                        >
                          <h3 className="font-semibold text-slate-900 font-black mb-2">Platform Agreement</h3>
                          <p className="mb-3 text-slate-900">1. Data Privacy</p>
                          <p className="mb-4">Your data is encrypted and stored securely. We do not sell your personal information to third parties.</p>
                          <p className="mb-3 text-slate-900">2. Compliance & KYC</p>
                          <p className="mb-4">You agree to provide accurate information for identity verification as required by regulatory bodies.</p>
                          <p className="mb-3 text-slate-900">3. Usage Policies</p>
                          <p className="mb-8">You agree to use the platform responsibly. Automated scraping, malicious activity, or attempts to bypass security are strictly prohibited.</p>
                          <p className="mb-4 text-slate-900">4. Monitoring</p>
                          <p className="mb-12">Security events are logged to protect your account and our infrastructure.</p>
                          <p className="mt-6 text-center text-xs text-slate-500 font-bold">End of agreement.</p>
                        </div>
                        {!termsScrolled && <p className="text-xs text-blue-600 text-center mt-2 flex items-center justify-center gap-1 animate-pulse"><ChevronDown size={14} /> Please scroll to the bottom to agree</p>}
                      </div>

                      <label className={`flex items-center gap-3 p-4 border rounded-xl transition-all cursor-pointer ${termsScrolled ? 'border-cyan-500/30 hover:border-cyan-500/50 bg-blue-600/5' : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'}`}>
                        <input type="checkbox" checked={termsAccepted} onChange={(e) => termsScrolled && setTermsAccepted(e.target.checked)} disabled={!termsScrolled}
                          className="w-4 h-4 text-cyan-500 bg-black/50 border-white/20 rounded focus:ring-cyan-500 focus:ring-offset-0" />
                        <span className="text-sm font-medium text-slate-200">I have read and agree to the terms</span>
                      </label>

                      <div className="flex gap-3 pt-4">
                        <button onClick={() => setStep(2)} className="px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-slate-900 font-black font-medium transition-all flex items-center justify-center">
                          <ArrowLeft size={18} />
                        </button>
                        <button onClick={() => setStep(4)} disabled={!canProceedStep3}
                          className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-slate-900 font-black rounded-xl font-medium transition-all shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          Continue <ArrowRight size={18} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: KYC Upload */}
                  {step === 4 && (
                    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 ml-1">Document Type</label>
                        <div className="relative">
                          <select value={docType} onChange={(e) => setDocType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-slate-900 font-black focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all shadow-inner appearance-none cursor-pointer">
                            <option value="passport" className="bg-slate-900">Passport</option>
                            <option value="national_id" className="bg-slate-900">National ID Card</option>
                            <option value="drivers_license" className="bg-slate-900">Driver's License</option>
                          </select>
                          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold uppercase tracking-widest text-[10px] pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900 ml-1">Upload Document (Optional)</label>
                        <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                          kycFile ? 'border-cyan-500/50 bg-blue-600/5' : 'border-slate-100 bg-slate-50 hover:border-white/20 hover:bg-slate-50'
                        }`} onClick={() => document.getElementById('kyc-file')?.click()}>
                          <input id="kyc-file" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setKycFile(e.target.files?.[0] || null)} className="hidden" />
                          
                          {kycFile ? (
                            <>
                              <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-600 flex items-center justify-center">
                                <CheckCircle2 size={24} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-blue-600">{kycFile.name}</p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">{(kycFile.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center">
                                <ShieldCheck size={24} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">Click to browse or drag file here</p>
                                <p className="text-xs text-slate-500 font-bold mt-1">JPG, PNG, or PDF up to 10MB</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm">
                          <AlertCircle size={18} className="shrink-0" /> {error}
                        </div>
                      )}

                      <div className="flex gap-3 pt-4">
                        <button onClick={() => setStep(3)} className="px-5 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-slate-900 font-black font-medium transition-all flex items-center justify-center">
                          <ArrowLeft size={18} />
                        </button>
                        <button onClick={handleSubmit} disabled={loading}
                          className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-slate-900 font-black rounded-xl font-medium transition-all shadow-md disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          {loading ? (
                            <><div className="w-4 h-4 border-2 border-slate-1000 border-t-white rounded-full animate-spin" /> Processing...</>
                          ) : kycFile ? 'Complete Setup' : 'Skip & Complete'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-8 text-center border-t border-slate-100 pt-6">
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                  Already have an account?{' '}
                  <a 
                    href="/login" 
                    onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/login'); window.dispatchEvent(new PopStateEvent('popstate')); }} 
                    className="text-blue-600 hover:text-cyan-300 font-medium transition-colors inline-flex items-center gap-1 group/link"
                  >
                     Sign In <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Global styles for custom scrollbar in terms box */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
      `}</style>
    </div>
  );
};
