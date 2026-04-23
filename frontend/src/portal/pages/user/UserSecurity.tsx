import React, { useState, useEffect } from 'react';
import { portalApi } from '../../api/portalApi';

const UserSecurity: React.FC = () => {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);

  useEffect(() => {
    portalApi.getLoginHistory().then(d => d?.events && setLoginHistory(d.events)).catch(() => {});
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { setError('Passwords do not match'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await portalApi.changePassword({
        current_password: currentPwd,
        new_password: newPwd,
        confirm_password: confirmPwd,
      });
      if (res.status === 'success') {
        setMessage('Password changed successfully');
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      } else {
        setError(res.detail || 'Failed to change password');
      }
    } catch { setError('Connection error'); }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Change Password */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">Current Password</label>
            <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)}
              className="w-full bg-slate-100/60 border border-gray-700/50 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-cyan-500 transition"
              required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">New Password</label>
            <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
              className="w-full bg-slate-100/60 border border-gray-700/50 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-cyan-500 transition"
              required minLength={8} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">Confirm New Password</label>
            <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full bg-slate-100/60 border border-gray-700/50 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-cyan-500 transition"
              required minLength={8} />
          </div>
          {error && <div className="p-3 bg-red-50 border border-red-500/20 rounded-xl text-red-600 text-sm">{error}</div>}
          {message && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm">{message}</div>}
          <button type="submit" disabled={loading}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-900 rounded-xl font-bold text-sm transition disabled:opacity-40">
            {loading ? 'Changing...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* 2FA Status */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between p-4 bg-slate-100/20 rounded-xl">
          <div>
            <div className="text-sm font-medium text-slate-900">TOTP Authenticator</div>
            <div className="text-[10px] text-slate-400">Use Google Authenticator or similar app</div>
          </div>
          <span className="px-3 py-1 bg-gray-700/50 text-slate-500 rounded-lg text-sm font-bold">NOT CONFIGURED</span>
        </div>
      </div>

      {/* Login History */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">Login History</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {loginHistory.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">No login history</p>
          ) : (
            loginHistory.map((l, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition text-xs">
                <span className={`w-2 h-2 rounded-full shrink-0 ${l.success ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-slate-500 font-mono shrink-0">{l.created_at?.substring(0, 19).replace('T', ' ')}</span>
                <span className="text-slate-400 shrink-0">{l.ip_address}</span>
                <span className="text-slate-400 truncate">{l.user_agent?.substring(0, 40)}</span>
                <span className={`ml-auto shrink-0 ${l.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {l.success ? '✓' : l.failure_reason || '✗'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSecurity;
