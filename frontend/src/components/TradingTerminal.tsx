import React, { useState, useEffect } from 'react';
import { ShieldAlert, Crosshair, Target, CheckCircle2, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface TradingTerminalProps {
  signal: any;
}

export const TradingTerminal: React.FC<TradingTerminalProps> = ({ signal }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [tradeStatus, setTradeStatus] = useState<{status: string, message: string} | null>(null);
  const [demoCash, setDemoCash] = useState<number | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/trade/metrics`);
      const data = await res.json();
      if (data.status === 'success') {
        setDemoCash(data.metrics.cash_reserves);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (!signal || !signal.trade_parameters) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mt-4 flex items-center justify-center h-40">
        <p className="text-slate-400 italic text-sm text-center font-bold uppercase tracking-widest">
          Trade Execution Parameters calculating...<br/>
          (Awaiting ML Risk Engine Assessment)
        </p>
      </div>
    );
  }

  const params = signal.trade_parameters;
  const isBullish = params.direction.toUpperCase() === 'BUY';
  const tradeCost = params.suggested_qty * params.entry_price_est;
  const insufficientFunds = demoCash !== null && demoCash < tradeCost;

  const executeTrade = async () => {
    setIsExecuting(true);
    setTradeStatus(null);
    try {
      const payload = {
        symbol: params.symbol,
        direction: params.direction,
        quantity: params.suggested_qty,
        entry_price: params.entry_price_est,
        target: params.target,
        stop_loss: params.stop_loss,
        risk_tag: params.risk_tag,
        confidence: params.confidence
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000')}/api/trade/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      setTradeStatus({
        status: data.status,
        message: data.status === 'success' ? `Order executed! ID: ${data.trade.broker_order_id}` : (data.message || data.error)
      });
      
      if (data.status === 'success') {
        fetchMetrics();
      }
    } catch (e) {
      setTradeStatus({ status: 'error', message: 'Connection to Broker API failed.' });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 mt-4 relative overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 p-3 opacity-10">
        {isBullish ? <TrendingUp size={100} className="text-green-600" /> : <TrendingDown size={100} className="text-red-600" />}
      </div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 tracking-wide uppercase text-sm">
            <ArrowRightLeft size={16} className="text-blue-600" /> Order Execution Terminal
          </h3>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${params.risk_tag === 'HIGH' ? 'bg-red-50 text-red-600 border border-red-100' : params.risk_tag === 'MEDIUM' ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
            {params.risk_tag} Risk
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><Crosshair size={12}/> Entry Range</div>
            <div className="font-sans text-sm text-slate-900 font-bold">{params.entry_range}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><Target size={12}/> Target Price</div>
            <div className="font-sans text-sm text-green-600 font-bold">₹{params.target}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><ShieldAlert size={12}/> Stop Loss (ATR)</div>
            <div className="font-sans text-sm text-red-600 font-bold">₹{params.stop_loss}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 flex items-center gap-1"><ShieldAlert size={12}/> Risk-Sized Qty</div>
            <div className="font-sans text-sm text-blue-600 font-bold">{params.suggested_qty} Shares</div>
          </div>
        </div>

        {tradeStatus ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg flex items-center gap-2 text-sm font-bold border ${tradeStatus.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
          >
            {tradeStatus.status === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
            {tradeStatus.message}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] text-blue-600 font-bold tracking-wide border border-blue-100 bg-blue-50 px-2 py-0.5 rounded animate-pulse uppercase">
                PAPER TRADE MODE
              </span>
              <div className="flex gap-3 text-[10px] font-bold uppercase">
                <span className="text-slate-400">Margin Req: <span className="text-slate-900">₹{tradeCost.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span></span>
                <span className="text-slate-400">Available: <span className={`font-bold ${insufficientFunds ? 'text-red-600' : 'text-blue-600'}`}>₹{(demoCash || 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}</span></span>
              </div>
            </div>
            <button 
              disabled={isExecuting || insufficientFunds}
              onClick={executeTrade}
              className={`w-full py-3 rounded-lg font-bold uppercase tracking-widest transition shadow-md ${
                isBullish 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } ${isExecuting || insufficientFunds ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isExecuting ? 'Processing Order...' : insufficientFunds ? 'Insufficient Funds' : `Place ${params.direction} Order (${params.suggested_qty} Qty)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
