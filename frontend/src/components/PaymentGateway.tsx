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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-indigo-500/10"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900/60 to-purple-900/40 px-6 py-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Zap size={16} className="text-indigo-400" />
            </div>
            <div>
              <div className="text-white font-bold text-sm tracking-wide">ProfitSense AI Pay</div>
              <div className="text-gray-400 text-[10px] uppercase tracking-wider">Secure Wallet Top-Up</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
              <Lock size={10} /> 256-bit SSL
            </div>
            {step !== 'processing' && step !== 'success' && (
              <button onClick={onClose} className="text-gray-500 hover:text-white transition">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Amount Display */}
        {step !== 'success' && (
          <div className="px-6 pt-5 pb-3">
            <div className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-wider">Amount to Add</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p}
                  onClick={() => { setAmount(p); setCustomAmount(''); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                    amount === p && !customAmount
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  ₹{(p / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setAmount(0); }}
                className="w-full pl-7 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            {effectiveAmount > 0 && (
              <div className="mt-2 text-center">
                <span className="text-2xl font-black text-white">
                  ₹{effectiveAmount.toLocaleString('en-IN')}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="px-6 pb-6">
          <AnimatePresence mode="wait">

            {/* Step 1: Method Selection */}
            {step === 'select_method' && (
              <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-xs text-gray-500 uppercase font-bold mb-3 tracking-wider">Choose Payment Method</div>
                <div className="space-y-2">
                  {[
                    { id: 'UPI', label: 'UPI', sub: 'GPay, PhonePe, BHIM, Paytm', icon: <Smartphone size={18} className="text-green-400" />, badge: 'Instant' },
                    { id: 'CARD', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay', icon: <CreditCard size={18} className="text-blue-400" />, badge: 'Secure' },
                    { id: 'NETBANKING', label: 'Net Banking', sub: 'All major banks supported', icon: <Building2 size={18} className="text-amber-400" />, badge: '' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleMethodSelect(m.id as PayMethod)}
                      className="w-full flex items-center gap-3 p-3.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl transition group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
                        {m.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          {m.label}
                          {m.badge && (
                            <span className="text-[9px] bg-green-500/15 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{m.sub}</div>
                      </div>
                      <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Enter Details */}
            {step === 'enter_details' && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => setStep('select_method')} className="text-xs text-indigo-400 hover:text-indigo-300 mb-4 flex items-center gap-1 transition">
                  ← Back
                </button>

                {method === 'UPI' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block">UPI ID</label>
                      <input
                        type="text"
                        placeholder="yourname@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500 transition"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {['@okaxis', '@oksbi', '@okhdfcbank', '@ybl', '@paytm'].map((vpa) => (
                        <button key={vpa} onClick={() => setUpiId(prev => prev.split('@')[0] + vpa)}
                          className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded border border-gray-700 hover:border-green-500/50 hover:text-green-400 transition">
                          {vpa}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Shield size={10} /> A payment request will be sent to your UPI app.
                    </p>
                  </div>
                )}

                {method === 'CARD' && (
                  <div className="space-y-3">
                    {/* Card Preview */}
                    <div className="bg-gradient-to-br from-indigo-800 to-purple-900 rounded-xl p-4 h-28 relative overflow-hidden mb-4">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6" />
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-4 -mb-4" />
                      <div className="relative z-10">
                        <div className="text-gray-300 font-mono text-sm tracking-widest">
                          {cardNum || '•••• •••• •••• ••••'}
                        </div>
                        <div className="flex justify-between mt-3 text-xs text-gray-400">
                          <span className="truncate max-w-[140px]">{cardName || 'CARDHOLDER NAME'}</span>
                          <span>{cardExpiry || 'MM/YY'}</span>
                        </div>
                      </div>
                    </div>
                    <input
                      type="text" placeholder="Card Number" maxLength={19}
                      value={cardNum} onChange={(e) => setCardNum(formatCard(e.target.value))}
                      className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition"
                    />
                    <input
                      type="text" placeholder="Name on Card"
                      value={cardName} onChange={(e) => setCardName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text" placeholder="MM/YY" maxLength={5}
                        value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition"
                      />
                      <input
                        type="password" placeholder="CVV" maxLength={4}
                        value={cardCvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                )}

                {method === 'NETBANKING' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block">Select Bank</label>
                      <div className="space-y-1.5">
                        {BANKS.map((b) => (
                          <button
                            key={b}
                            onClick={() => setSelectedBank(b)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition border ${
                              selectedBank === b
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-600'
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
                  className="w-full mt-5 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Lock size={14} />
                  Pay ₹{effectiveAmount.toLocaleString('en-IN')} Securely
                </button>

                <p className="text-center text-[10px] text-gray-600 mt-2">
                  Your payment info is protected with bank-grade 256-bit encryption
                </p>
              </motion.div>
            )}

            {/* Step 3: Processing */}
            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 text-center">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                  <div
                    className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"
                    style={{ animationDuration: '0.8s' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={28} className="text-indigo-400 animate-spin" style={{ animationDuration: '1.2s' }} />
                  </div>
                </div>
                <div className="text-white font-semibold text-sm mb-1">{processingMsg}</div>
                <div className="text-gray-500 text-xs mb-4">Do not close this window</div>
                {/* Progress bar */}
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <motion.div
                    className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-600 font-mono">{progress}%</div>
              </motion.div>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-5"
                >
                  <CheckCircle2 size={40} className="text-green-400" />
                </motion.div>
                <div className="text-2xl font-black text-green-400 mb-1">
                  ₹{effectiveAmount.toLocaleString('en-IN')} Added!
                </div>
                <div className="text-gray-400 text-sm">Your ProfitSense AI wallet has been credited.</div>
                <div className="text-gray-600 text-xs mt-2">Returning to terminal...</div>
              </motion.div>
            )}

            {/* Step 5: Failed */}
            {step === 'failed' && (
              <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/15 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-4">
                  <X size={28} className="text-red-400" />
                </div>
                <div className="text-red-400 font-bold mb-1">Payment Failed</div>
                <div className="text-gray-500 text-sm mb-5">{errorMsg}</div>
                <button
                  onClick={() => setStep('select_method')}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition"
                >
                  Try Again
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== 'processing' && step !== 'success' && (
          <div className="border-t border-gray-800 px-6 py-3 flex items-center justify-center gap-4">
            {['RuPay', 'VISA', 'Mastercard', 'UPI', 'BHIM'].map((brand) => (
              <span key={brand} className="text-[10px] text-gray-600 font-bold tracking-wider border border-gray-800 px-1.5 py-0.5 rounded">
                {brand}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
