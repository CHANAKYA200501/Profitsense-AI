import React, { useState, useEffect } from 'react';
import { usePortalAuth } from '../../store/usePortalAuth';
import { portalApi } from '../../api/portalApi';

const UserDashboard: React.FC = () => {
  const { user } = usePortalAuth();
  const [profile, setProfile] = useState<any>(null);
  const [recentLogins, setRecentLogins] = useState<any[]>([]);

  useEffect(() => {
    portalApi.getProfile().then(d => d?.user && setProfile(d.user)).catch(() => {});
    portalApi.getLoginHistory().then(d => d?.events && setRecentLogins(d.events.slice(0, 5))).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <h1 className="text-xl font-black text-slate-900 mb-1">Welcome back, {user?.name || 'User'}</h1>
        <p className="text-sm text-slate-500">Here's your account overview.</p>
      </div>

      {/* Account Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
          <span className="text-[10px] text-slate-400 font-bold tracking-wider">Account Status</span>
          <div className={`text-lg font-black mt-1 ${user?.status === 'active' ? 'text-emerald-600' : 'text-amber-500'}`}>
            {user?.status?.replace('_', ' ').toUpperCase()}
          </div>
        </div>
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
          <span className="text-[10px] text-slate-400 font-bold tracking-wider">KYC Verification</span>
          <div className={`text-lg font-black mt-1 ${
            profile?.kyc_submissions?.some((k: any) => k.status === 'approved') ? 'text-emerald-600' :
            profile?.kyc_submissions?.some((k: any) => k.status === 'pending') ? 'text-amber-500' :
            'text-slate-400'
          }`}>
            {profile?.kyc_submissions?.length > 0 ? profile.kyc_submissions[profile.kyc_submissions.length - 1].status?.toUpperCase() : 'NOT SUBMITTED'}
          </div>
        </div>
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
          <span className="text-[10px] text-slate-400 font-bold tracking-wider">Member Since</span>
          <div className="text-lg font-black text-slate-900 mt-1">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
          </div>
        </div>
      </div>

      {/* Recent Login Activity */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">Recent Login Activity</h3>
        {recentLogins.length === 0 ? (
          <p className="text-slate-400 text-sm py-4 text-center">No login history</p>
        ) : (
          <div className="space-y-1">
            {recentLogins.map((l, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition text-xs">
                <span className={`w-2 h-2 rounded-full ${l.success ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-slate-500 font-mono">{l.created_at?.substring(0, 19).replace('T', ' ')}</span>
                <span className="text-slate-400">{l.ip_address}</span>
                <span className="text-slate-400 ml-auto">{l.success ? 'Success' : l.failure_reason || 'Failed'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
