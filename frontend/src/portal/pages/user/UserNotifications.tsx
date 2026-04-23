import React, { useState, useEffect } from 'react';
import { portalApi } from '../../api/portalApi';

const typeIcons: Record<string, { color: string; bg: string }> = {
  security: { color: 'text-red-600', bg: 'bg-red-500/15' },
  kyc: { color: 'text-amber-500', bg: 'bg-yellow-500/15' },
  account: { color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
};

const UserNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.getNotifications().then(d => { if (d?.notifications) setNotifications(d.notifications); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-black text-slate-900 mb-6">Notifications</h2>
      {notifications.length === 0 ? (
        <div className="text-center py-16 bg-white shadow-sm rounded-2xl border border-slate-200">
          <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-slate-400 text-sm">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const style = typeIcons[n.type] || typeIcons.account;
            return (
              <div key={n.id} className={`bg-white shadow-sm border border-slate-200 rounded-2xl p-4 hover:border-gray-700/50 transition ${!n.read ? 'border-l-2 border-l-indigo-500' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <svg className={`w-4 h-4 ${style.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {n.type === 'security' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      ) : n.type === 'kyc' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900">{n.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserNotifications;
