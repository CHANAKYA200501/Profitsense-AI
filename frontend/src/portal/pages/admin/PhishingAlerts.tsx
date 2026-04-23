/**
 * Phishing Alerts Dashboard
 * - Threat table with columns: timestamp, user, threat type, URL, risk score, status
 * - Detail modal with full analysis
 * - Admin dismiss/escalate actions
 */
import React, { useState, useEffect, useCallback } from 'react';
import { portalApi } from '../../api/portalApi';

const riskColor = (score: number) => {
  if (score > 70) return 'text-red-600 bg-red-500/15';
  if (score > 40) return 'text-amber-500 bg-yellow-500/15';
  return 'text-emerald-600 bg-green-500/15';
};

const statusBadge: Record<string, string> = {
  blocked: 'bg-red-500/15 text-red-600 border-red-500/20',
  flagged: 'bg-yellow-500/15 text-amber-500 border-amber-200',
  dismissed: 'bg-gray-700/50 text-slate-400 border-gray-600/20',
  allowed: 'bg-green-500/15 text-emerald-600 border-emerald-200',
};

const PhishingAlerts: React.FC = () => {
  const [threats, setThreats] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedThreat, setSelectedThreat] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        portalApi.getPhishingLogs(page, statusFilter || undefined),
        portalApi.getPhishingStats(),
      ]);
      if (logsData?.threats) { setThreats(logsData.threats); setTotal(logsData.total); }
      if (statsData?.stats) setStats(statsData.stats);
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (threatId: string, action: string) => {
    try {
      await portalApi.phishingAction(threatId, action);
      setSelectedThreat(null);
      await load();
    } catch { /* ignore */ }
  };

  return (
    <div>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Threats', value: stats.total_threats, color: 'text-indigo-400' },
            { label: 'Today', value: stats.threats_today, color: 'text-red-600' },
            { label: 'Blocked', value: stats.blocked, color: 'text-orange-400' },
            { label: 'Users Affected', value: stats.users_affected, color: 'text-amber-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white shadow-sm border border-slate-200 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider">{label}</span>
              <div className={`text-xl font-black font-mono mt-1 ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
          aria-label="Filter by status">
          <option value="">All Statuses</option>
          <option value="blocked">Blocked</option>
          <option value="flagged">Flagged</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <button onClick={load} className="ml-auto px-3 py-2.5 bg-slate-100/60 rounded-xl text-slate-500 hover:text-slate-900 text-xs border border-gray-700/50 transition">
          ↻ Refresh
        </button>
      </div>

      {/* Threats Table */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 tracking-wider">
                <th className="text-left px-4 py-3 font-bold">Timestamp</th>
                <th className="text-left px-4 py-3 font-bold">User</th>
                <th className="text-left px-4 py-3 font-bold">Threat Types</th>
                <th className="text-left px-4 py-3 font-bold">URL / Content</th>
                <th className="text-left px-4 py-3 font-bold">Risk Score</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-right px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : threats.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">No threats detected</td></tr>
              ) : (
                threats.map((t, i) => (
                  <tr key={t.id} className={`border-t border-slate-200/40 hover:bg-slate-100/20 transition cursor-pointer ${i % 2 ? 'bg-[#080e1e]' : ''}`}
                    onClick={() => setSelectedThreat(t)}>
                    <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap">{t.created_at?.substring(0, 19).replace('T', ' ')}</td>
                    <td className="px-4 py-3 text-slate-600">{t.detected_by_user_id?.substring(0, 8) || 'System'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(t.threat_types || []).map((tt: string) => (
                          <span key={tt} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-xs font-bold">{tt.replace('_', ' ')}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{t.url || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg font-bold font-mono ${riskColor(t.risk_score)}`}>{t.risk_score}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-sm font-bold border ${statusBadge[t.status] || ''}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); handleAction(t.id, 'dismiss'); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition mr-1" title="Dismiss" aria-label="Dismiss threat">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleAction(t.id, 'escalate'); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Escalate" aria-label="Escalate threat">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/40">
          <span className="text-[10px] text-slate-400">{total} threats</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 bg-slate-100/40 disabled:opacity-30 transition">← Prev</button>
            <button onClick={() => setPage(page + 1)} disabled={threats.length < 20}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 bg-slate-100/40 disabled:opacity-30 transition">Next →</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedThreat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Threat Analysis</h3>
              <button onClick={() => setSelectedThreat(null)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition" aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
                <span className="text-3xl font-black font-mono" style={{ color: selectedThreat.risk_score > 70 ? '#ef4444' : selectedThreat.risk_score > 40 ? '#f59e0b' : '#22c55e' }}>
                  {selectedThreat.risk_score}
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-900">Risk Score</div>
                  <div className="text-[10px] text-slate-400">{selectedThreat.risk_score > 70 ? 'HIGH RISK — Auto-blocked' : selectedThreat.risk_score > 40 ? 'MEDIUM — Warning issued' : 'LOW — Allowed'}</div>
                </div>
              </div>

              {[
                ['URL', selectedThreat.url],
                ['Detected By', selectedThreat.detected_by_user_id || 'System'],
                ['Content Hash', selectedThreat.content_hash?.substring(0, 16) + '...'],
                ['Status', selectedThreat.status],
                ['Detected At', new Date(selectedThreat.created_at).toLocaleString()],
              ].map(([label, val]) => (
                <div key={label as string} className="bg-slate-100/20 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 tracking-wider block mb-0.5">{label}</span>
                  <span className="text-sm text-slate-900 break-all">{val || '—'}</span>
                </div>
              ))}

              <div className="bg-slate-100/20 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 tracking-wider block mb-1">Threat Types</span>
                <div className="flex flex-wrap gap-1">
                  {(selectedThreat.threat_types || []).map((tt: string) => (
                    <span key={tt} className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold">{tt.replace('_', ' ')}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleAction(selectedThreat.id, 'dismiss')}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-slate-900 rounded-xl font-bold text-sm transition">
                ✓ Dismiss
              </button>
              <button onClick={() => handleAction(selectedThreat.id, 'escalate')}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-slate-900 rounded-xl font-bold text-sm transition">
                ⚠ Escalate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhishingAlerts;
