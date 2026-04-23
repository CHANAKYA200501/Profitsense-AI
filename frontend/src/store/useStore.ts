import { create } from 'zustand';

interface Signal {
  id: string;
  symbol: string;
  confidence: number;
  direction: 'bullish' | 'bearish';
  recommendation?: 'BUY' | 'SELL' | 'HOLD';
  narration?: {
    headline: string;
    what_happened: string;
    suggested_action: string;
  };
  trade_parameters?: {
    symbol: string;
    direction: string;
    entry_range: string;
    entry_price_est: number;
    target: number;
    stop_loss: number;
    risk_tag: string;
    suggested_qty: number;
    confidence: number;
    time_horizon?: string;
  };
  technical_indicators?: {
    rsi_14: number;
    macd?: { macd: number; signal: number; histogram: number; crossover: string };
    ema_20: number;
    ema_50: number;
    breakout: boolean;
  };
  patterns?: {
    type: string;
    label: string;
    explanation: string;
    success_rate: number;
    severity: string;
  }[];
  decision_reasons?: string[];
  timestamp: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
}

interface AppState {
  signals: Signal[];
  connected: boolean;
  activeSymbol: string | null;
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setSignals: (signals: Signal[]) => void;
  addSignal: (signal: Signal) => void;
  setConnected: (status: boolean) => void;
  setActiveSymbol: (symbol: string) => void;
  activeView: 'dashboard' | 'portfolio' | 'backtest' | 'market' | 'analysis' | 'intraday' | 'expiry' | 'prediction' | 'tradeadvisor' | 'buysell' | 'opportunityradar' | 'videoengine' | 'admin';
  setActiveView: (view: 'dashboard' | 'portfolio' | 'backtest' | 'market' | 'analysis' | 'intraday' | 'expiry' | 'prediction' | 'tradeadvisor' | 'buysell' | 'opportunityradar' | 'videoengine' | 'admin') => void;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  signals: [],
  connected: false,
  activeSymbol: null,
  activeView: 'dashboard',
  user: JSON.parse(localStorage.getItem('et_user') || 'null'),
  token: localStorage.getItem('et_token'),
  isAuthenticated: !!localStorage.getItem('et_token'),
  setSignals: (signals) => set({ signals }),
  addSignal: (signal) => set((state) => ({ signals: [signal, ...state.signals.slice(0, 49)] })),
  setConnected: (status) => set({ connected: status }),
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),
  setActiveView: (view) => set({ activeView: view }),
  setAuth: (user, token) => {
    localStorage.setItem('et_user', JSON.stringify(user));
    localStorage.setItem('et_token', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('et_user');
    localStorage.removeItem('et_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
