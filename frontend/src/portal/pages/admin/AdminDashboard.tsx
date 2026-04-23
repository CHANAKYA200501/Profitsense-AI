/**
 * Admin Dashboard Overview
 * - Metric cards (total users, active sessions, pending KYC, phishing alerts, blocked accounts)
 * - Real-time activity feed
 * - Daily logins line chart (Recharts)
 * - Suspicious activity heatmap by hour
 */
import React, { useState, useEffect, useCallback } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { portalApi } from '../../api/portalApi';

const MetricCard = ({ label, value, icon, color, trend }: { label: string; value: string | number; icon: string; color: string; trend?: string }) => (
  <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 hover:border-gray-700/50 transition-all group">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] text-slate-400 font-bold tracking-wider">{label}</span>
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
        <svg className="w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
        </svg>
      </div>
    </div>
    <div className="text-2xl font-black text-slate-900 font-mono">{value}</div>
    {trend && <div className="text-[10px] text-slate-400 mt-1">{trend}</div>}
  </div>
);

const HeatmapCell = ({ value, hour }: { value: number; hour: number }) => {
  const intensity = Math.min(1, value / 10);
  const bg = intensity > 0.7 ? 'bg-red-500' : intensity > 0.3 ? 'bg-yellow-500' : intensity > 0 ? 'bg-green-500' : 'bg-slate-100';
  return (
    <div className="flex flex-col items-center gap-1" title={`${hour}:00 — ${value} events`}>
      <div className={`w-6 h-6 rounded-md ${bg} transition-all`} style={{ opacity: Math.max(0.15, intensity) }} />
      <span className="text-[8px] text-slate-400 font-mono">{hour}</span>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, activityData] = await Promise.all([
        portalApi.getDashboardStats(),
        portalApi.getDashboardActivity(30),
      ]);
      if (statsData?.stats) setStats(statsData.stats);
      if (activityData?.activity) setActivity(activityData.activity);
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const metrics = [
    { label: 'Total Users', value: stats?.total_users ?? 0, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'bg-indigo-600', trend: 'Registered accounts' },
    { label: 'Active Sessions', value: stats?.active_sessions ?? 0, icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'bg-green-600', trend: 'Last 15 minutes' },
    { label: 'Pending KYC', value: stats?.pending_kyc ?? 0, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'bg-yellow-600', trend: 'Awaiting review' },
    { label: 'Phishing Today', value: stats?.phishing_alerts_today ?? 0, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: 'bg-red-600', trend: 'Threats detected' },
    { label: 'Blocked Accounts', value: stats?.blocked_accounts ?? 0, icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636', color: 'bg-gray-600', trend: 'Locked accounts' },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Logins Chart */}
        <div className="lg:col-span-2 bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-wider">Daily Logins</h3>
            <span className="text-[10px] text-slate-400">Last 30 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.daily_logins || []}>
                <defs>
                  <linearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#loginGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Suspicious Activity Heatmap */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">Suspicious Activity</h3>
          <p className="text-[10px] text-slate-400 mb-3">Failed logins by hour of day</p>
          <div className="grid grid-cols-12 gap-1">
            {(stats?.hourly_suspicious || Array(24).fill(0)).map((val: number, h: number) => (
              <HeatmapCell key={h} value={val} hour={h} />
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
            <span>Low</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded bg-slate-100" />
              <div className="w-3 h-3 rounded bg-green-500/30" />
              <div className="w-3 h-3 rounded bg-yellow-500/60" />
              <div className="w-3 h-3 rounded bg-red-500/80" />
            </div>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-wider">Real-Time Activity Feed</h3>
          <button onClick={load} className="text-xs text-slate-400 hover:text-slate-900 transition px-3 py-1.5 bg-slate-100/60 rounded-lg border border-gray-700/50">
            ↻ Refresh
          </button>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {activity.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No recent activity. Perform admin actions to populate the feed.</p>
          ) : (
            activity.map((a, i) => (
              <div key={a.id || i} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition text-xs">
                <span className="text-slate-400 font-mono shrink-0 w-16">{a.timestamp?.substring(11, 19)}</span>
                <span className={`font-mono font-bold shrink-0 w-32 truncate ${
                  a.action_type?.includes('delete') ? 'text-red-600' :
                  a.action_type?.includes('block') ? 'text-amber-500' :
                  a.action_type?.includes('approve') ? 'text-emerald-600' :
                  'text-indigo-400'
                }`}>{a.action_type}</span>
                <span className="text-slate-500 truncate">{a.target_type} → {a.target_id?.substring(0, 8)}</span>
                <span className="text-slate-400 ml-auto shrink-0">{a.ip_address}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
