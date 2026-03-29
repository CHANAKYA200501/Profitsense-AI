import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, TrendingDown, Wallet, Plus, Loader2,
  ShieldCheck, Target, BarChart3, CheckCircle2,
  ShieldAlert, Zap, ArrowUpRight, ArrowDownRight, RefreshCw,
  Clock, Activity,
} from 'lucide-react';
import { PaymentGateway } from '../components/PaymentGateway';

/* ─────────────────── Types ─────────────────── */
interface StockInfo {
  symbol: string;
  ltp: number;
  day_open: number;
  day_high: number;
  day_low: number;
  change_pct: number;
  total_volume: number;
}

interface OrderResult {
  status: 'success' | 'error';
  message: string;
  trade?: any;
  remaining_balance?: number;
}

type OrderType = 'MARKET' | 'LIMIT';
type Direction = 'BUY' | 'SELL';

/* ─────────────────── Quick-pick symbols ─────────────────── */
const QUICK_SYMBOLS = [
  'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','SBIN',
  'BHARTIARTL','ITC','BAJFINANCE','WIPRO','HINDUNILVR','LT',
  'AXISBANK','MARUTI','TATAMOTORS','SUNPHARMA','HCLTECH','TITAN',
  'NTPC','ADANIPORTS','KOTAKBANK','NESTLEIND','TECHM','DRREDDY',
];

/* ═══════════════ Component ═══════════════════ */
export const BuySellView: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [direction, setDirection] = useState<Direction>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<string>('');

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  const [showPayment, setShowPayment] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  /* ── Fetch wallet ── */
  const fetchWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const res = await fetch('http://localhost:8000/api/trade/wallet');
      const data = await res.json();
      if (data.status === 'success') setWalletBalance(data.balance);
    } catch { /* silent */ }
    setLoadingWallet(false);
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  /* ── Fetch LTP ── */
  const fetchQuote = useCallback(async (sym: string) => {
    setLoadingQuote(true);
    setQuoteError(null);
    setStockInfo(null);
    try {
      const res = await fetch(
        `http://localhost:8000/api/market/intraday?symbol=${encodeURIComponent(sym)}&interval=5m`
      );
      const data = await res.json();
      if (data.status === 'success' && data.stats) {
        setStockInfo({ symbol: sym, ...data.stats });
        if (orderType === 'LIMIT') setLimitPrice(String(data.stats.ltp));
      } else {
        setQuoteError(data.error || 'Failed to load market data.');
      }
    } catch {
      setQuoteError('Network connection interrupted.');
    }
    setLoadingQuote(false);
  }, [orderType]);

  const handleSelectSymbol = (sym: string) => {
    setActiveSymbol(sym);
    setSearchInput('');
    setOrderResult(null);
    fetchQuote(sym);
  };

  const handleSearch = () => {
    const s = searchInput.trim().toUpperCase();
    if (s) handleSelectSymbol(s);
  };

  /* ── Computed values ── */
  const execPrice = orderType === 'LIMIT' ? parseFloat(limitPrice) || 0 : (stockInfo?.ltp || 0);
  const totalCost = quantity * execPrice;
  const isPositive = (stockInfo?.change_pct ?? 0) >= 0;

  /* ── Place Order ── */
  const placeOrder = async () => {
    if (!activeSymbol || quantity < 1 || execPrice <= 0) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const payload: any = {
        symbol: activeSymbol,
        direction,
        quantity,
        order_type: orderType,
      };
      if (orderType === 'LIMIT') payload.limit_price = execPrice;

      const res = await fetch('http://localhost:8000/api/trade/manual_execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setOrderResult({ status: data.status, message: data.message, trade: data.trade, remaining_balance: data.remaining_balance });
      if (data.status === 'success') {
        setRecentOrders((prev) => [data.trade, ...prev.slice(0, 9)]);
        if (data.remaining_balance !== undefined) setWalletBalance(data.remaining_balance);
        fetchWallet();
      }
    } catch {
      setOrderResult({ status: 'error', message: 'Terminal API timeout.' });
    }
    setPlacing(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#f8fafc] font-sans relative">

      {/* Payment Gateway Overlay */}
      <AnimatePresence>
        {showPayment && (
          <PaymentGateway
            onClose={() => setShowPayment(false)}
            onSuccess={(_amount, newBal) => {
              setShowPayment(false);
              setWalletBalance(newBal);
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-10 py-6 flex items-center justify-between shrink-0 z-20 relative">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <Zap size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Order Execution</h2>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-2 italic">Manual trade entry terminal.</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 bg-white border border-slate-200 px-6 py-3 shadow-sm">
            <Wallet size={16} className="text-blue-600 opacity-60" />
            <div>
              <div className="text-[8px] text-slate-400 uppercase font-bold leading-none tracking-widest italic mb-1">Paper Wallet</div>
              <div className="text-lg font-black text-slate-900 italic tracking-tighter">
                {loadingWallet ? (
                  <Loader2 size={12} className="animate-spin text-slate-400 inline" />
                ) : walletBalance !== null ? (
                  `₹${walletBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                ) : 'Offline'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            className="flex items-center gap-3 px-6 py-4 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm italic"
          >
            <Plus size={14} /> Add Funds
          </button>
          <button
            onClick={fetchWallet}
            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-blue-600 hover:border-blue-600 transition-all shadow-sm group"
          >
            <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left Panel: Order Interface ── */}
        <div className="w-[450px] min-w-[400px] flex flex-col border-r border-slate-200 bg-white z-20 relative">
          
          {/* Search */}
          <div className="p-8 border-b border-slate-100">
            <div className="relative group">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Search Ticker..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-24 py-4 bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600 transition-all italic"
              />
              <button
                onClick={handleSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-5 py-2 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm"
              >
                Fetch
              </button>
            </div>
          </div>

          {/* Trending Symbols */}
          <div className="p-8 border-b border-slate-100 bg-slate-50">
            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-4 px-1 italic">Trending Symbols:</div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar">
              {QUICK_SYMBOLS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelectSymbol(s)}
                  className={`px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition-all border ${
                    activeSymbol === s
                      ? 'bg-blue-50 text-blue-600 border-blue-600 shadow-sm'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-blue-600 hover:text-blue-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
            {!activeSymbol ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 py-12 italic">
                <Activity size={40} className="mb-6 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Ticker Selection</p>
                <p className="text-[9px] mt-2 opacity-50 uppercase">Select a security to initialize execution terminal</p>
              </div>
            ) : (
              <>
                {loadingQuote && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-blue-600" />
                  </div>
                )}
                {quoteError && (
                  <div className="text-red-600 text-[10px] font-bold uppercase tracking-widest bg-red-50 border border-red-100 p-6 italic">
                    Error: {quoteError}
                  </div>
                )}
                {stockInfo && !loadingQuote && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-8 border border-slate-200 bg-white relative group overflow-hidden shadow-sm`}
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full ${isPositive ? 'bg-green-500' : 'bg-red-500'} opacity-20`} />
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">{stockInfo.symbol}</div>
                        <div className={`text-3xl font-black mt-2 italic tracking-tighter ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{stockInfo.ltp.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 text-[10px] font-bold italic tracking-widest ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {isPositive ? '+' : ''}{stockInfo.change_pct}%
                      </div>
                    </div>
                  </motion.div>
                )}

                {stockInfo && (
                  <div className="space-y-8 relative z-10">
                    {/* Direction */}
                    <div className="grid grid-cols-2 gap-4">
                      {(['BUY', 'SELL'] as Direction[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDirection(d)}
                          className={`py-4 font-bold text-[10px] tracking-widest transition-all border italic ${
                            direction === d
                              ? d === 'BUY'
                                ? 'bg-green-600 border-green-600 text-white shadow-sm'
                                : 'bg-red-600 border-red-600 text-white shadow-sm'
                              : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {d === 'BUY' ? <ArrowUpRight size={14} className="inline mr-2" /> : <ArrowDownRight size={14} className="inline mr-2" />}
                          {d} ORDER
                        </button>
                      ))}
                    </div>

                    {/* Order Type */}
                    <div className="space-y-3">
                      <label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest italic block">Order Type:</label>
                      <div className="grid grid-cols-2 gap-4">
                        {(['MARKET', 'LIMIT'] as OrderType[]).map((t) => (
                          <button
                            key={t}
                            onClick={() => setOrderType(t)}
                            className={`py-3 text-[10px] font-bold tracking-widest border transition-all uppercase italic ${
                              orderType === t
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Limit Price */}
                    {orderType === 'LIMIT' && (
                       <div className="space-y-3">
                        <label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest italic block">Limit Price:</label>
                        <input
                          type="number"
                          value={limitPrice}
                          onChange={(e) => setLimitPrice(e.target.value)}
                          className="w-full px-6 py-4 bg-white border border-slate-200 text-slate-900 text-xs italic focus:outline-none focus:border-blue-600 transition-all font-bold"
                        />
                      </div>
                    )}

                    {/* Quantity */}
                    <div className="space-y-3">
                      <label className="text-[9px] text-slate-400 uppercase font-bold tracking-widest italic block">Quantity:</label>
                      <div className="flex items-center gap-4">
                        <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="w-14 h-14 bg-white border border-slate-200 text-slate-400 hover:border-blue-600 hover:text-blue-600 transition-all font-bold text-xl italic">−</button>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-900 text-sm font-bold text-center italic focus:outline-none focus:border-blue-600 transition-all"
                        />
                        <button onClick={() => setQuantity((q) => q + 1)} className="w-14 h-14 bg-white border border-slate-200 text-slate-400 hover:border-blue-600 hover:text-blue-600 transition-all font-bold text-xl italic">+</button>
                      </div>
                      <div className="grid grid-cols-5 gap-2 mt-4">
                        {[5, 10, 25, 50, 100].map((n) => (
                          <button key={n} onClick={() => setQuantity(n)}
                            className="py-2 text-[9px] font-bold bg-white hover:bg-slate-50 text-slate-400 hover:text-blue-600 border border-slate-100 hover:border-blue-600 transition-all italic">
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-white border border-slate-200 p-6 space-y-4 italic relative overflow-hidden group shadow-sm">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 -rotate-45 translate-x-10 -translate-y-10" />
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest italic group-hover:translate-x-1 transition-transform">
                        <span className="text-slate-400">Execution Price</span>
                        <span className="text-slate-900 font-sans italic">₹{execPrice.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest italic group-hover:translate-x-1 transition-transform">
                        <span className="text-slate-400">Quantity</span>
                        <span className="text-slate-900 font-sans italic">{quantity}</span>
                      </div>
                      <div className="border-t border-slate-100 pt-4 flex justify-between items-center group-hover:translate-x-1 transition-transform">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Total Value</span>
                        <span className="text-xl font-black text-slate-900 tracking-tighter shadow-sm font-sans italic">₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                      {walletBalance !== null && direction === 'BUY' && (
                        <div className={`text-[9px] font-bold uppercase tracking-widest italic flex items-center gap-2 pt-2 group-hover:translate-x-1 transition-all ${walletBalance < totalCost ? 'text-red-600' : 'text-green-600'}`}>
                          {walletBalance < totalCost ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                          {walletBalance < totalCost ? 'Insufficient funds.' : 'Funds available.'}
                        </div>
                      )}
                    </div>

                    {/* Place Order */}
                    <AnimatePresence>
                      {orderResult ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`p-6 border flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest italic ${
                            orderResult.status === 'success'
                              ? 'bg-green-50 text-green-600 border-green-200 shadow-sm'
                              : 'bg-red-50 text-red-600 border-red-200 shadow-sm'
                          }`}
                        >
                          {orderResult.status === 'success' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
                          <span className="flex-1">{orderResult.message}</span>
                          <button onClick={() => setOrderResult(null)} className="text-slate-400 hover:text-blue-600 transition-colors underline decoration-2 underline-offset-4">Reset</button>
                        </motion.div>
                      ) : (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={placeOrder}
                          disabled={placing || quantity < 1 || execPrice <= 0 || (direction === 'BUY' && walletBalance !== null && walletBalance < totalCost)}
                          className={`w-full py-5 font-black text-[12px] uppercase tracking-widest italic transition-all shadow-sm border disabled:opacity-20 disabled:grayscale ${
                            direction === 'BUY'
                              ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                              : 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                          }`}
                        >
                          {placing ? (
                            <span className="flex items-center justify-center gap-3">
                              <Loader2 size={18} className="animate-spin" /> Executing...
                            </span>
                          ) : direction === 'BUY' ? (
                            <span className="flex items-center justify-center gap-3">
                              <ArrowUpRight size={18} /> Place Buy Order: {quantity} × {activeSymbol}
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-3">
                              <ArrowDownRight size={18} /> Place Sell Order: {quantity} × {activeSymbol}
                            </span>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>

                    <p className="text-center text-[8px] text-slate-400 uppercase font-bold tracking-widest italic">
                      Disclaimer: Paper execution mode active. No actual capital at risk.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right Panel: Execution Log & Metrics ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-10 gap-8 z-10 relative">

          {/* Market Metrics */}
          {activeSymbol && stockInfo && (
            <div className="grid grid-cols-4 gap-4 shrink-0">
              {[
                { label: 'Ticker Symbol', value: stockInfo.symbol, icon: <Zap size={12} />, color: 'text-slate-900' },
                { label: 'Current Price', value: `₹${stockInfo.ltp.toLocaleString('en-IN')}`, icon: <Target size={12} />, color: isPositive ? 'text-green-600' : 'text-red-600' },
                { label: 'Day Volume', value: `${(stockInfo.total_volume / 1e6).toFixed(2)}M`, icon: <BarChart3 size={12} />, color: 'text-slate-400' },
                { label: 'Price Change', value: `${isPositive ? '+' : ''}${stockInfo.change_pct}%`, icon: isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />, color: isPositive ? 'text-green-600' : 'text-red-600' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-slate-200 p-5 relative group overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-slate-50 -rotate-45 translate-x-4 -translate-y-4" />
                  <div className={`flex items-center gap-2 text-[8px] uppercase font-bold mb-2 tracking-widest italic ${stat.color} opacity-60`}>
                    {stat.icon} {stat.label}
                  </div>
                  <div className={`text-xl font-black italic tracking-tighter ${stat.color} group-hover:translate-x-1 transition-transform`}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Execution Log */}
          <div className="flex-1 bg-white border border-slate-200 overflow-hidden flex flex-col relative group shadow-sm">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="font-bold text-slate-900 text-[10px] flex items-center gap-3 tracking-widest uppercase italic">
                <Clock size={16} className="text-blue-600" /> Execution Log
              </h3>
              <div className="flex items-center gap-4">
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                 <span className="text-[8px] text-blue-600 font-bold uppercase tracking-widest italic">Real-time updates</span>
              </div>
            </div>
            {recentOrders.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center italic">
                <div className="opacity-20">
                  <Activity size={40} className="text-slate-300 mx-auto mb-6" />
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No transactions in session</p>
                  <p className="text-slate-300 text-[9px] mt-2 uppercase">Your recent orders will appear here</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <table className="w-full text-[10px] font-bold text-slate-900 italic tracking-widest">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-50 uppercase tracking-widest bg-slate-50">
                      <th className="py-4 px-6 text-left font-bold">Order ID</th>
                      <th className="py-4 px-6 text-left font-bold">Symbol</th>
                      <th className="py-4 px-6 text-left font-bold">Side</th>
                      <th className="py-4 px-6 text-right font-bold">Price</th>
                      <th className="py-4 px-6 text-right font-bold">Qty</th>
                      <th className="py-4 px-6 text-right font-bold">Value</th>
                      <th className="py-4 px-6 text-left font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentOrders.map((order, i) => (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-slate-50 transition-all group/row"
                      >
                        <td className="py-5 px-6 text-slate-400 font-sans group-hover:text-slate-900 transition-colors">#{order.id.slice(0, 8)}</td>
                        <td className="py-5 px-6 font-black text-slate-900 tracking-tighter">{order.symbol}</td>
                        <td className="py-5 px-6">
                          <span className={`px-3 py-1 text-[8px] font-bold border ${order.direction === 'BUY' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                            {order.direction}
                          </span>
                        </td>
                        <td className="py-5 px-6 text-right text-slate-400 group-hover:text-slate-900 transition-colors font-sans italic">₹{order.entry_price.toLocaleString('en-IN')}</td>
                        <td className="py-5 px-6 text-right text-slate-400 group-hover:text-slate-900 transition-colors font-sans italic">{order.quantity}</td>
                        <td className="py-5 px-6 text-right text-slate-900 font-sans italic">
                          ₹{(order.entry_price * order.quantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-5 px-6">
                          <span className="px-3 py-1 bg-slate-900 text-white text-[8px] font-bold tracking-widest">
                            {order.status}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Access */}
          <div className="shrink-0">
            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-4 italic">Quick Symbols:</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_SYMBOLS.slice(0, 16).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelectSymbol(s)}
                  className={`px-3 py-1.5 text-[8px] font-bold uppercase tracking-widest transition-all border italic ${
                    activeSymbol === s
                      ? 'bg-blue-50 text-blue-600 border-blue-600 shadow-sm'
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
