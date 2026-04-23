import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import {
  LayoutDashboard, Radio, TrendingUp, Users, FileText,
  Shield, RefreshCw, Trash2, CheckCircle, AlertTriangle,
  Activity, DollarSign, BarChart2, ChevronRight,
  XCircle, RotateCcw
} from 'lucide-react';

const API = 'http://localhost:8000/api/admin';

// ── Helpers ────────────────────────────────────────────────────────────────
async function apiCall(path: string, method = 'GET', token: string) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return res.json();
}

const SectionHeader = ({ title, icon: Icon, action }: { title: string; icon: any; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-indigo-400" />
      <h2 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h2>
    </div>
    {action}
  </div>
);

const Badge = ({ label, color }: { label: string; color: 'green' | 'red' | 'yellow' | 'blue' | 'indigo' | 'gray' }) => {
  const map = { green: 'bg-green-500/20 text-green-400', red: 'bg-red-500/20 text-red-400', yellow: 'bg-yellow-500/20 text-yellow-400', blue: 'bg-blue-500/20 text-blue-400', indigo: 'bg-indigo-500/20 text-indigo-400', gray: 'bg-gray-700 text-gray-400' };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${map[color]}`}>{label}</span>;
};

// ── Overview Section ────────────────────────────────────────────────────────
const Overview = ({ token }: { token: string }) => {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, l] = await Promise.all([apiCall('/stats', 'GET', token), apiCall('/logs', 'GET', token)]);
    if (s.status === 'success') setStats(s.stats);
    if (l.status === 'success') setLogs(l.activity || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const statCards = stats ? [
    { label: 'Uptime', value: stats.uptime, icon: Activity, color: 'text-green-400' },
    { label: 'Total Signals', value: stats.total_signals, icon: Radio, color: 'text-blue-400' },
    { label: 'Total Trades', value: stats.total_trades, icon: TrendingUp, color: 'text-indigo-400' },
    { label: 'Open Trades', value: stats.open_trades, icon: BarChart2, color: 'text-yellow-400' },
    { label: 'Total P&L', value: `₹${stats.total_pnl?.toLocaleString('en-IN')}`, icon: DollarSign, color: stats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Demo Cash', value: `₹${stats.demo_cash?.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-violet-400' },
  ] : [];

  return (
    <div>
      <SectionHeader title="Platform Overview" icon={LayoutDashboard} action={
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      } />
      {loading ? (
        <div className="flex items-center justify-center h-40"><span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{label}</span>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className={`text-xl font-black font-mono ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Activity Feed */}
          <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4">
            <div className="text-[11px] text-gray-500 uppercase font-bold tracking-wider mb-3">Recent Activity</div>
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No activity yet. Run a scan to populate.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="text-gray-600 font-mono shrink-0">{log.ts?.substring(11, 19)}</span>
                    <span className="text-indigo-400 font-mono shrink-0">{log.event}</span>
                    <span className="text-gray-400">{log.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Signals Section ─────────────────────────────────────────────────────────
const SignalsSection = ({ token }: { token: string }) => {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterSymbol, setFilterSymbol] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiCall('/signals?limit=100', 'GET', token);
    if (data.status === 'success') setSignals(data.signals || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const deleteSignal = async (id: string) => {
    setDeleting(id);
    const res = await apiCall(`/signals/${id}`, 'DELETE', token);
    if (res.status === 'success') {
      setSignals(prev => prev.filter(s => s.id !== id));
      setToast('Signal deleted');
      setTimeout(() => setToast(''), 2500);
    }
    setDeleting(null);
  };

  const clearAll = async () => {
    if (!confirm('Delete ALL signals?')) return;
    await apiCall('/signals', 'DELETE', token);
    setSignals([]);
    setToast('All signals cleared');
    setTimeout(() => setToast(''), 2500);
  };

  const filtered = filterSymbol ? signals.filter(s => s.symbol?.toLowerCase().includes(filterSymbol.toLowerCase())) : signals;

  return (
    <div>
      <SectionHeader title="Signal Management" icon={Radio} action={
        <div className="flex gap-2">
          <input value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)} placeholder="Filter symbol…"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 w-32" />
          <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
            <Trash2 className="w-3 h-3" /> Clear All
          </button>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      } />

      {toast && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mb-4 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
          <CheckCircle className="w-4 h-4" />{toast}
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Radio className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No signals found. Run a scan first.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-800/60 text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-bold">Symbol</th>
                <th className="text-left px-4 py-3 font-bold">Direction</th>
                <th className="text-left px-4 py-3 font-bold">Confidence</th>
                <th className="text-left px-4 py-3 font-bold">Rec.</th>
                <th className="text-left px-4 py-3 font-bold">Timestamp</th>
                <th className="text-right px-4 py-3 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-t border-gray-800/60 hover:bg-gray-800/30 transition ${i % 2 === 0 ? '' : 'bg-gray-900/30'}`}>
                  <td className="px-4 py-3 font-bold text-white font-mono">{s.symbol}</td>
                  <td className="px-4 py-3"><Badge label={s.direction} color={s.direction === 'bullish' ? 'green' : 'red'} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.confidence}%` }} />
                      </div>
                      <span className="text-gray-300 font-mono">{s.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge label={s.recommendation || '—'} color={s.recommendation === 'BUY' ? 'green' : s.recommendation === 'SELL' ? 'red' : 'yellow'} /></td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{s.timestamp?.substring(0, 19).replace('T', ' ')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteSignal(s.id)} disabled={deleting === s.id}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                      {deleting === s.id ? <span className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin inline-block" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Trades Section ─────────────────────────────────────────────────────────
const TradesSection = ({ token }: { token: string }) => {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiCall('/trades', 'GET', token);
    if (data.status === 'success') setTrades(data.trades || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const closeTrade = async (id: string) => {
    await apiCall(`/trades/${id}`, 'DELETE', token);
    setTrades(prev => prev.map(t => t.id === id ? { ...t, status: 'CLOSED' } : t));
    setToast(`Trade ${id} closed`);
    setTimeout(() => setToast(''), 2500);
  };

  const resetDemo = async () => {
    if (!confirm('Reset demo balance to ₹10,00,000 and clear all trades?')) return;
    const res = await apiCall('/reset-demo-balance', 'POST', token);
    if (res.status === 'success') { setTrades([]); setToast(res.message); setTimeout(() => setToast(''), 3000); }
  };

  return (
    <div>
      <SectionHeader title="Trade Management" icon={TrendingUp} action={
        <div className="flex gap-2">
          <button onClick={resetDemo} className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 px-3 py-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20 transition">
            <RotateCcw className="w-3 h-3" /> Reset Demo
          </button>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 transition">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      } />

      {toast && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
          <CheckCircle className="w-4 h-4" />{toast}
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : trades.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No trades yet. Execute trades from the Trading Terminal.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-800/60 text-gray-500 uppercase tracking-wider">
                {['Trade ID', 'Symbol', 'Direction', 'Qty', 'Entry', 'Target', 'Stop Loss', 'P&L', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-3 py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={t.id} className={`border-t border-gray-800/60 hover:bg-gray-800/30 transition ${i % 2 === 0 ? '' : 'bg-gray-900/30'}`}>
                  <td className="px-3 py-3 text-gray-500 font-mono">{t.id}</td>
                  <td className="px-3 py-3 font-bold text-white font-mono">{t.symbol}</td>
                  <td className="px-3 py-3"><Badge label={t.direction} color={t.direction === 'BUY' ? 'green' : 'red'} /></td>
                  <td className="px-3 py-3 text-gray-300">{t.quantity}</td>
                  <td className="px-3 py-3 text-gray-300 font-mono">₹{t.entry_price?.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-green-400 font-mono">₹{t.target?.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-red-400 font-mono">₹{t.stop_loss?.toLocaleString('en-IN')}</td>
                  <td className={`px-3 py-3 font-bold font-mono ${(t.profit_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(t.profit_loss || 0) >= 0 ? '+' : ''}₹{(t.profit_loss || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-3"><Badge label={t.status} color={t.status === 'OPEN' ? 'green' : 'gray'} /></td>
                  <td className="px-3 py-3">
                    {t.status === 'OPEN' && (
                      <button onClick={() => closeTrade(t.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Users Section ───────────────────────────────────────────────────────────
const UsersSection = ({ token }: { token: string }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('/users', 'GET', token);
      if (data.status === 'success') {
        setUsers(data.users || []);
      } else {
        setError(data.detail || 'Could not load users.');
      }
    } catch {
      setError('Connection to admin API failed.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const deleteUser = async (id: string) => {
    if (!confirm('Permanently delete this user?')) return;
    const res = await apiCall(`/users/${id}`, 'DELETE', token);
    if (res.status === 'success') {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  return (
    <div>
      <SectionHeader title="User Management" icon={Users} action={
        <button onClick={loadUsers} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 transition">
          <RefreshCw className="w-3 h-3" />
        </button>
      } />
      
      {loading ? (
        <div className="flex items-center justify-center h-24"><span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : error ? (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-4 bg-gray-800/60 border border-gray-700/50 rounded-xl group hover:border-indigo-500/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/10">
                  {u.email?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{u.email}</div>
                  <div className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase">{u.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-[10px] text-gray-500 hidden sm:block">
                  <div>Joined: {new Date(u.created_at).toLocaleDateString()}</div>
                  <div>Last login: {u.last_login ? new Date(u.last_login).toLocaleTimeString() : 'Never'}</div>
                </div>
                <Badge label={u.role || 'user'} color={u.role === 'admin' ? 'indigo' : 'gray'} />
                
                {u.role !== 'admin' && (
                   <button onClick={() => deleteUser(u.id)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-center py-10 text-gray-600 italic">No users registered.</p>}
        </div>
      )}
    </div>
  );
};

// ── Logs Section ────────────────────────────────────────────────────────────
const LogsSection = ({ token }: { token: string }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'server' | 'activity'>('server');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiCall('/logs?lines=200', 'GET', token);
    if (data.status === 'success') { setLogs(data.server_log || []); setActivity(data.activity || []); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const levelColor = (line: string) => {
    if (line.includes('ERROR') || line.includes('error')) return 'text-red-400';
    if (line.includes('WARNING') || line.includes('WARN')) return 'text-yellow-400';
    if (line.includes('INFO')) return 'text-blue-400';
    return 'text-gray-400';
  };

  return (
    <div>
      <SectionHeader title="Server Logs" icon={FileText} action={
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 transition">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      } />
      <div className="flex gap-2 mb-4">
        {(['server', 'activity'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-800/60 text-gray-400 hover:text-white border border-gray-700'}`}>
            {tab === 'server' ? `Server Log (${logs.length})` : `Activity (${activity.length})`}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-32"><span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : activeTab === 'server' ? (
        <div className="bg-[#0d0d0d] border border-gray-800 rounded-xl p-4 h-96 overflow-y-auto font-mono text-[11px] space-y-0.5">
          {logs.length === 0 ? <p className="text-gray-600 text-center py-8">No log file found on server.</p> : logs.map((line, i) => (
            <div key={i} className={levelColor(line)}>{line}</div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
          {activity.length === 0 ? <p className="text-gray-500 text-sm text-center py-8">No activity yet.</p> : activity.map((a, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/30 transition text-xs">
              <span className="text-gray-600 font-mono shrink-0">{a.ts?.substring(11, 19)}</span>
              <span className="text-indigo-400 font-mono font-bold shrink-0 w-32 truncate">{a.event}</span>
              <span className="text-gray-400 truncate">{a.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Admin Panel ──────────────────────────────────────────────────────
type Section = 'overview' | 'signals' | 'trades' | 'users' | 'logs';

export const AdminPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const { user, token, logout } = useStore();

  const nav: { id: Section; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'signals', label: 'Signals', icon: Radio },
    { id: 'trades', label: 'Trades', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'logs', label: 'Logs', icon: FileText },
  ];

  const renderSection = () => {
    if (!token) return <div className="text-gray-500 text-sm">Loading session...</div>;
    switch (activeSection) {
      case 'overview': return <Overview token={token} />;
      case 'signals': return <SignalsSection token={token} />;
      case 'trades': return <TradesSection token={token} />;
      case 'users': return <UsersSection token={token} />;
      case 'logs': return <LogsSection token={token} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] flex">
      {/* Sidebar */}
      <div className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-wider">ProfitSense AI</div>
              <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Admin Console</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition group ${activeSection === id ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/60'}`}>
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                {label}
              </div>
              {activeSection === id && <ChevronRight className="w-3 h-3" />}
            </button>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-black">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-200 truncate">{user?.email}</div>
              <div className="text-[10px] text-indigo-400 font-bold uppercase">{user?.role}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => { window.history.pushState({}, '', '/portal/admin'); window.dispatchEvent(new PopStateEvent('popstate')); }}
              className="flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold text-indigo-400 hover:text-white hover:bg-indigo-500/20 border border-indigo-500/30 transition shadow-sm uppercase tracking-wider"
              title="Security Portal"
            >
              <Shield className="w-3 h-3" /> Security Portal
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white hover:bg-gray-800/60 border border-gray-700 transition uppercase tracking-wider"
                title="Return to Terminal"
              >
                Terminal
              </button>
              <button onClick={logout}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-gray-700 hover:border-red-500/30 transition uppercase tracking-wider"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-white capitalize">{activeSection}</h1>
            <p className="text-[11px] text-gray-500">ProfitSense AI Admin Console • Live Platform Control</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="text-[11px] text-green-400 font-bold">Platform Online</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}>
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
