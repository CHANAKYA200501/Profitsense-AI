/**
 * Activity / Audit Logs
 * Paginated audit log with filters by admin, action type, date range
 */
import React, { useState, useEffect, useCallback } from 'react';
import { portalApi } from '../../api/portalApi';

const actionColors: Record<string, string> = {
  user_registered: 'text-emerald-600',
  admin_login: 'text-indigo-400',
  user_deleted: 'text-red-600',
  user_blocked: 'text-red-600',
  user_suspended: 'text-orange-400',
  kyc_approved: 'text-emerald-600',
  kyc_rejected: 'text-red-600',
  phishing_dismiss: 'text-slate-500',
  phishing_escalate: 'text-red-600',
  password_changed: 'text-amber-500',
  logout: 'text-slate-500',
  bulk_suspend: 'text-orange-400',
  bulk_delete: 'text-red-600',
};

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 30 };
      if (actionFilter) params.action_type = actionFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await portalApi.getAuditLogs(params);
      if (data?.logs) { setLogs(data.logs); setTotal(data.total); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, actionFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="bg-white shadow-sm border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
          aria-label="Filter by action">
          <option value="">All Actions</option>
          <option value="admin_login">Admin Login</option>
          <option value="user_registered">Registration</option>
          <option value="user_deleted">User Deleted</option>
          <option value="user_blocked">User Blocked</option>
          <option value="user_suspended">User Suspended</option>
          <option value="kyc_approved">KYC Approved</option>
          <option value="kyc_rejected">KYC Rejected</option>
          <option value="password_changed">Password Changed</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="bg-white shadow-sm border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
          aria-label="From date" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="bg-white shadow-sm border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
          aria-label="To date" />
        <button onClick={load} className="ml-auto px-3 py-2.5 bg-slate-100/60 rounded-xl text-slate-500 hover:text-slate-900 text-xs border border-gray-700/50 transition">
          ↻ Refresh
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 tracking-wider">
                <th className="text-left px-4 py-3 font-bold">Timestamp</th>
                <th className="text-left px-4 py-3 font-bold">Admin</th>
                <th className="text-left px-4 py-3 font-bold">Action</th>
                <th className="text-left px-4 py-3 font-bold">Target</th>
                <th className="text-left px-4 py-3 font-bold">IP Address</th>
                <th className="text-left px-4 py-3 font-bold">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No audit logs found</td></tr>
              ) : (
                logs.map((l, i) => (
                  <tr key={l.id} className={`border-t border-slate-200/40 hover:bg-slate-100/20 transition ${i % 2 ? 'bg-[#080e1e]' : ''}`}>
                    <td className="px-4 py-3 text-slate-400 font-mono whitespace-nowrap">{l.timestamp?.substring(0, 19).replace('T', ' ')}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{l.admin_id?.substring(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${actionColors[l.action_type] || 'text-slate-500'}`}>
                        {l.action_type?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{l.target_type} / {l.target_id?.substring(0, 8)}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{l.ip_address || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">
                      {l.after_state ? JSON.stringify(l.after_state).substring(0, 50) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200/40">
          <span className="text-[10px] text-slate-400">{total} total entries</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 bg-slate-100/40 disabled:opacity-30 transition">← Prev</button>
            <button onClick={() => setPage(page + 1)} disabled={logs.length < 30}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-900 bg-slate-100/40 disabled:opacity-30 transition">Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
