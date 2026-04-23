/**
 * Admin Settings Page
 */
import React from 'react';

const AdminSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">General Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-100/20 rounded-xl">
            <div>
              <div className="text-sm font-medium text-slate-900">Two-Factor Authentication</div>
              <div className="text-[10px] text-slate-400">Required for all admin accounts</div>
            </div>
            <span className="px-3 py-1 bg-green-500/15 text-emerald-600 rounded-lg text-sm font-bold">ENABLED</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-100/20 rounded-xl">
            <div>
              <div className="text-sm font-medium text-slate-900">Session Timeout</div>
              <div className="text-[10px] text-slate-400">Auto-logout after inactivity</div>
            </div>
            <span className="text-sm text-slate-600 font-mono">15 minutes</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-100/20 rounded-xl">
            <div>
              <div className="text-sm font-medium text-slate-900">Max Login Attempts</div>
              <div className="text-[10px] text-slate-400">Before account lockout</div>
            </div>
            <span className="text-sm text-slate-600 font-mono">5 attempts</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-100/20 rounded-xl">
            <div>
              <div className="text-sm font-medium text-slate-900">KYC Document Retention</div>
              <div className="text-[10px] text-slate-400">Auto-delete after approval</div>
            </div>
            <span className="text-sm text-slate-600 font-mono">90 days</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-100/20 rounded-xl">
            <div>
              <div className="text-sm font-medium text-slate-900">Rate Limiting</div>
              <div className="text-[10px] text-slate-400">Global: 100/15min, Auth: 10/15min</div>
            </div>
            <span className="px-3 py-1 bg-green-500/15 text-emerald-600 rounded-lg text-sm font-bold">ACTIVE</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-100/20 rounded-xl">
            <div>
              <div className="text-sm font-medium text-slate-900">CORS Policy</div>
              <div className="text-[10px] text-slate-400">Whitelisted origins only</div>
            </div>
            <span className="px-3 py-1 bg-green-500/15 text-emerald-600 rounded-lg text-sm font-bold">ENFORCED</span>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">Security Headers</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { header: 'Content-Security-Policy', status: 'Configured' },
            { header: 'Strict-Transport-Security', status: 'Enabled' },
            { header: 'X-Frame-Options', status: 'DENY' },
            { header: 'X-Content-Type-Options', status: 'nosniff' },
            { header: 'X-XSS-Protection', status: '1; mode=block' },
            { header: 'Referrer-Policy', status: 'strict-origin' },
          ].map(({ header, status }) => (
            <div key={header} className="bg-slate-100/20 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 tracking-wider block mb-0.5">{header}</span>
              <span className="text-xs text-emerald-600 font-mono">{status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">TOTP Admin Key</h3>
        <p className="text-xs text-slate-500 mb-3">Use this base32 key in your authenticator app (Google Authenticator, Authy):</p>
        <div className="bg-slate-100/40 rounded-xl p-4 font-mono text-lg text-indigo-400 text-center select-all">
          JBSWY3DPEHPK3PXP
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">This is a development key. Replace in production.</p>
      </div>
    </div>
  );
};

export default AdminSettings;
