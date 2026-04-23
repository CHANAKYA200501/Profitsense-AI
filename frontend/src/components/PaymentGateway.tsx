import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Shield, CheckCircle2, Loader2, CreditCard, Smartphone, Building2,
  Lock, ChevronRight, IndianRupee, Zap,
} from 'lucide-react';

interface PaymentGatewayProps {
  onClose: () => void;
  onSuccess: (amount: number, newBalance: number) => void;
}

type PayStep = 'select_method' | 'enter_details' | 'processing' | 'success' | 'failed';
type PayMethod = 'UPI' | 'CARD' | 'NETBANKING';

const PRESET_AMOUNTS = [25000, 50000, 100000, 250000, 500000];
const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'];

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<PayStep>('select_method');
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [amount, setAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [processingMsg, setProcessingMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const effectiveAmount = customAmount ? parseFloat(customAmount) || 0 : amount;

  const handleMethodSelect = (m: PayMethod) => {
    setMethod(m);
    setStep('enter_details');
  };

  const handlePay = async () => {
    if (effectiveAmount <= 0) return;
    setStep('processing');
    setProgress(0);

    const msgs = [
      'Connecting to payment gateway...',
      'Verifying transaction details...',
      'Authenticating with bank...',
      'Completing secure transfer...',
      'Crediting your ProfitSense AI wallet...',
    ];

    for (let i = 0; i < msgs.length; i++) {
      setProcessingMsg(msgs[i]);
      setProgress((i + 1) * 20);
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));
    }

    // Call backend
    try {
      const ref = `ETM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const res = await fetch('http://localhost:8000/api/trade/add_funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: effectiveAmount,
          payment_method: method,
          transaction_ref: ref,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStep('success');
        setTimeout(() => onSuccess(effectiveAmount, data.new_balance), 1800);
      } else {
        setErrorMsg(data.message || 'Payment failed');
        setStep('failed');
      }
    } catch {
      setErrorMsg('Connection error. Please try again.');
      setStep('failed');
    }
  };

  const formatCard = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl relative"
      >
        {/* Top Accent */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600" />

        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <Zap size={18} className="text-blue-600" />
            </div>
            <div>
              <div className="text-slate-900 font-black text-sm tracking-tighter uppercase italic">ProfitSense Pay</div>
              <div className="text-[9px] text-blue-600 uppercase tracking-widest font-bold">Secure Wallet Top-Up</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[9px] text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 font-bold uppercase tracking-widest">
              <Lock size={10} /> 256-bit SSL
            </div>
            {step !== 'processing' && step !== 'success' && (
              <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Amount Display */}
        {step !== 'success' && (
          <div className="px-8 pt-6 pb-4">
            <div className="text-[9px] text-slate-400 uppercase font-bold mb-3 tracking-widest italic">Amount to Add</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setAmount(p); setCustomAmount(''); }}
                  className={`px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition-all border ${
                    amount === p && !customAmount
                      ? 'bg-blue-50 text-blue-600 border-blue-600 shadow-sm'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-blue-600 hover:text-blue-600'
                  }`}
                >
                  ₹{(p / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
                className="w-full pl-10 pr-6 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-600 transition-all italic"
              />
            </div>
            {effectiveAmount > 0 && (
              <div className="mt-4 text-center">
                <span className="text-3xl font-black text-slate-900 tracking-tighter italic">
                  ₹{effectiveAmount.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="px-8 pb-8">
          <AnimatePresence mode="wait">

            {/* Step 1: Method Selection */}
            {step === 'select_method' && (
              <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-[9px] text-slate-400 uppercase font-bold mb-4 tracking-widest italic">Choose Payment Method</div>
                <div className="space-y-3">
                  {[
                    { id: 'UPI', label: 'UPI', sub: 'GPay, PhonePe, BHIM, Paytm', icon: <Smartphone size={18} className="text-green-600" />, badge: 'Instant' },
                    { id: 'CARD', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay', icon: <CreditCard size={18} className="text-blue-600" />, badge: 'Secure' },
                    { id: 'NETBANKING', label: 'Net Banking', sub: 'All major banks supported', icon: <Building2 size={18} className="text-slate-600" />, badge: '' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleMethodSelect(m.id as PayMethod)}
                      className="w-full flex items-center gap-4 p-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-600 transition-all group"
                    >
                      <div className="w-10 h-10 bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                        {m.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-black text-slate-900 flex items-center gap-3 tracking-tighter uppercase italic">
                          {m.label}
                          {m.badge && (
                            <span className="text-[8px] bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 font-bold uppercase tracking-widest">
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{m.sub}</div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 transition" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Enter Details */}
            {step === 'enter_details' && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setStep('select_method')} className="text-[10px] text-blue-600 hover:text-blue-700 mb-5 flex items-center gap-2 transition font-bold uppercase tracking-widest italic">
                  ← Back
                </button>

                {method === 'UPI' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase font-bold mb-2 block tracking-widest italic">UPI ID</label>
                      <input
                        type="text"
                        placeholder="yourname@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-600 transition-all italic"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['@okaxis', '@oksbi', '@okhdfcbank', '@ybl', '@paytm'].map((vpa) => (
                        <button key={vpa} onClick={() => setUpiId(prev => prev.split('@')[0] + vpa)}
                          className="px-3 py-1.5 bg-white text-slate-400 text-[9px] font-bold border border-slate-100 hover:border-blue-600 hover:text-blue-600 transition-all uppercase tracking-widest">
                          {vpa}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 flex items-center gap-2 font-bold uppercase tracking-widest italic">
                      <Shield size={10} className="text-blue-600" /> A payment request will be sent to your UPI app.
                    </p>
                  </div>
                )}

                {method === 'CARD' && (
                  <div className="space-y-4">
                    {/* Card Preview */}
                    <div className="bg-slate-900 p-6 h-32 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full -mr-6 -mt-6" />
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-600/10 rounded-full -ml-4 -mb-4" />
                      <div className="relative z-10">
                        <div className="text-slate-300 font-mono text-sm tracking-widest">
                          {cardNum || '•••• •••• •••• ••••'}
                        </div>
                        <div className="flex justify-between mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          <span className="truncate max-w-[140px]">{cardName || 'CARDHOLDER NAME'}</span>
                          <span>{cardExpiry || 'MM/YY'}</span>
                        </div>
                      </div>
                    </div>
                    <input
                      type="text" placeholder="Card Number" maxLength={19}
                      value={cardNum} onChange={(e) => setCardNum(formatCard(e.target.value))}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-blue-600 transition-all"
                    />
                    <input
                      type="text" placeholder="Name on Card"
                      value={cardName} onChange={(e) => setCardName(e.target.value)}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-600 transition-all italic"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text" placeholder="MM/YY" maxLength={5}
                        value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        className="px-5 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-blue-600 transition-all"
                      />
                      <input
                        type="password" placeholder="CVV" maxLength={4}
                        value={cardCvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="px-5 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-blue-600 transition-all"
                      />
                    </div>
                  </div>
                )}

                {method === 'NETBANKING' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase font-bold mb-3 block tracking-widest italic">Select Bank</label>
                      <div className="space-y-2">
                        {BANKS.map((b) => (
                          <button
                            key={b}
                            onClick={() => setSelectedBank(b)}
                            className={`w-full text-left px-5 py-3 text-xs transition-all border font-bold uppercase italic ${
                              selectedBank === b
                                ? 'bg-blue-50 text-blue-600 border-blue-600 shadow-sm'
                                : 'bg-white text-slate-400 border-slate-100 hover:border-blue-600 hover:text-blue-600'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePay}
                  disabled={
                    effectiveAmount <= 0 ||
                    (method === 'UPI' && !upiId.includes('@')) ||
                    (method === 'CARD' && (cardNum.length < 19 || cardExpiry.length < 5 || cardCvv.length < 3)) ||
                    (method === 'NETBANKING' && !selectedBank)
                  }
                  className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-md italic"
                >
                  <Lock size={14} />
                  Pay ₹{effectiveAmount.toLocaleString('en-IN')} Securely
                </button>

                <p className="text-center text-[9px] text-slate-400 mt-3 font-bold uppercase tracking-widest italic">
                  Protected with bank-grade 256-bit encryption
                </p>
              </motion.div>
            )}

            {/* Step 3: Processing */}
            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 border-2 border-slate-100" />
                  <div
                    className="absolute inset-0 border-2 border-blue-600 border-t-transparent animate-spin"
                    style={{ animationDuration: '0.8s' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={28} className="text-blue-600 animate-spin" style={{ animationDuration: '1.2s' }} />
                  </div>
                </div>
                <div className="text-slate-900 font-bold text-sm uppercase tracking-widest italic mb-2">{processingMsg}</div>
                <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-6 italic">Do not close this window</div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5 border border-slate-200 overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-600"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="mt-3 text-[10px] text-slate-400 font-black tracking-widest">{progress}%</div>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-6 shadow-sm"
                >
                  <CheckCircle2 size={40} className="text-green-600" />
                </motion.div>
                <div className="text-3xl font-black text-green-600 mb-2 tracking-tighter italic">
                  ₹{effectiveAmount.toLocaleString('en-IN')} Added!
                </div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Your ProfitSense AI wallet has been credited.</div>
                <div className="text-slate-400 text-[9px] mt-3 uppercase tracking-widest font-bold italic">Returning to terminal...</div>
              </motion.div>
            )}

            {/* Step 5: Failed */}
            {step === 'failed' && (
              <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center">
                <div className="w-16 h-16 bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <X size={28} className="text-red-600" />
                </div>
                <div className="text-red-600 font-black uppercase tracking-widest text-sm mb-2 italic">Payment Failed</div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6 italic">{errorMsg}</div>
                <button
                  onClick={() => setStep('select_method')}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-md italic"
                >
                  Try Again
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== 'processing' && step !== 'success' && (
          <div className="border-t border-slate-100 px-8 py-3 flex items-center justify-center gap-4">
            {['RuPay', 'VISA', 'Mastercard', 'UPI', 'BHIM'].map((brand) => (
              <span key={brand} className="text-[9px] text-slate-300 font-bold tracking-widest border border-slate-100 px-2 py-0.5 uppercase">
                {brand}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
