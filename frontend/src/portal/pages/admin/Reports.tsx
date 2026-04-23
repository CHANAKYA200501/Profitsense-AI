/**
 * Reports - Generate CSV/PDF reports for selected metrics and date range
 */
import React, { useState } from 'react';
import { portalApi } from '../../api/portalApi';

const reportTypes = [
  { id: 'users', label: 'User Report', desc: 'All registered users with status and KYC info', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'kyc', label: 'KYC Submissions', desc: 'All KYC submissions with review status', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'phishing', label: 'Phishing Threats', desc: 'Detected threats with risk scores', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { id: 'activity', label: 'Audit Log', desc: 'All admin actions and audit events', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'login_events', label: 'Login Events', desc: 'All login attempts with success/failure', icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1' },
];

const Reports: React.FC = () => {
  const [selectedType, setSelectedType] = useState('users');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setMessage('');
    try {
      const res = await portalApi.generateReport(selectedType, 'csv', dateFrom || undefined, dateTo || undefined);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedType}_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        setMessage('✓ Report downloaded successfully');
      } else {
        setMessage('Failed to generate report');
      }
    } catch {
      setMessage('Error downloading report');
    }
    setDownloading(false);
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {reportTypes.map((r) => (
          <button key={r.id} onClick={() => setSelectedType(r.id)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              selectedType === r.id
                ? 'bg-indigo-600/10 border-indigo-500/30 shadow-lg shadow-indigo-600/10'
                : 'bg-white shadow-sm border-slate-200 hover:border-gray-700/50'
            }`}>
            <div className="flex items-center gap-3 mb-2">
              <svg className={`w-5 h-5 ${selectedType === r.id ? 'text-indigo-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={r.icon} />
              </svg>
              <span className={`text-sm font-bold ${selectedType === r.id ? 'text-slate-900' : 'text-slate-600'}`}>{r.label}</span>
            </div>
            <p className="text-[10px] text-slate-400">{r.desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">Configure Report</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-100/60 border border-gray-700/50 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 transition"
              aria-label="From date" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 tracking-wider mb-2">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-100/60 border border-gray-700/50 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 transition"
              aria-label="To date" />
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${message.includes('✓') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-500/20'}`}>
            {message}
          </div>
        )}

        <button onClick={handleDownload} disabled={downloading}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-slate-900 rounded-xl font-bold text-sm transition-all disabled:opacity-40 shadow-lg shadow-indigo-600/20">
          {downloading ? (
            <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</span>
          ) : (
            '↓ Download CSV Report'
          )}
        </button>
      </div>
    </div>
  );
};

export default Reports;
