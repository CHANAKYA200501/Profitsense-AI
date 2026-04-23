/**
 * KYC Review Panel
 * - Pending submissions list
 * - Document viewer with zoom
 * - User details side-by-side
 * - Approve / Reject (with reason) / Request Resubmission
 */
import React, { useState, useEffect, useCallback } from 'react';
import { portalApi } from '../../api/portalApi';

const KycReview: React.FC = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await portalApi.getPendingKyc();
      if (data?.submissions) setSubmissions(data.submissions);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (decision: string) => {
    if (!selectedKyc) return;
    if (decision === 'rejected' && !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await portalApi.reviewKyc(
        selectedKyc.id,
        decision,
        decision === 'rejected' ? rejectReason : undefined
      );
      setSelectedKyc(null);
      setRejectReason('');
      await load();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-wider">KYC Review Queue</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">{submissions.length} pending submissions</p>
        </div>
        <button onClick={load} className="px-3 py-2 bg-slate-100/60 rounded-xl text-slate-500 hover:text-slate-900 text-xs transition border border-gray-700/50">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 bg-white shadow-sm rounded-2xl border border-slate-200">
          <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-400 text-sm">All KYC submissions have been reviewed!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {submissions.map((s) => (
            <div key={s.id} className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 hover:border-gray-700/50 transition cursor-pointer"
              onClick={() => { setSelectedKyc(s); setZoomLevel(1); }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-amber-200 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{s.user_name || 'Unknown User'}</div>
                    <div className="text-xs text-slate-400">{s.user_email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold">{s.document_type?.replace('_', ' ')}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{new Date(s.submitted_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-white shadow-sm border border-slate-200 rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-slate-900">KYC Document Review</h3>
              <button onClick={() => setSelectedKyc(null)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition" aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Document Viewer */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 tracking-wider mb-3">ID Document</h4>
                <div className="bg-slate-50 border border-gray-700/30 rounded-xl p-4 flex flex-col items-center">
                  <div className="w-full aspect-[4/3] bg-slate-50 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                    <div className="text-slate-400 text-sm text-center p-4" style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s' }}>
                      <svg className="w-16 h-16 mx-auto mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p>Document: {selectedKyc.document_s3_key}</p>
                      <p className="text-[10px] text-gray-700 mt-1">Type: {selectedKyc.document_type}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))} className="px-3 py-1 bg-slate-100 rounded-lg text-slate-500 text-xs hover:text-slate-900 transition">−</button>
                    <span className="px-3 py-1 text-slate-400 text-xs">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))} className="px-3 py-1 bg-slate-100 rounded-lg text-slate-500 text-xs hover:text-slate-900 transition">+</button>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 tracking-wider mb-3">Personal Details</h4>
                <div className="space-y-3">
                  {[
                    ['Full Name', selectedKyc.personal_info?.full_name || selectedKyc.user_name],
                    ['Email', selectedKyc.user_email],
                    ['Document Type', selectedKyc.document_type?.replace('_', ' ')],
                    ['Document Number', selectedKyc.personal_info?.document_number || '—'],
                    ['Submitted', new Date(selectedKyc.submitted_at).toLocaleString()],
                    ['Submission ID', selectedKyc.id],
                  ].map(([label, val]) => (
                    <div key={label as string} className="bg-slate-100/20 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 tracking-wider block mb-0.5">{label}</span>
                      <span className="text-sm text-slate-900">{val || '—'}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="mt-6 space-y-3">
                  <button onClick={() => handleReview('approved')} disabled={actionLoading}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-slate-900 rounded-xl font-bold text-sm transition disabled:opacity-40">
                    ✓ Approve KYC
                  </button>

                  <div className="bg-slate-100/20 rounded-xl p-3 space-y-2">
                    <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Rejection reason (required)..."
                      className="w-full bg-slate-100/60 border border-gray-700/50 rounded-lg px-3 py-2 text-slate-900 text-xs placeholder-gray-600 focus:outline-none focus:border-red-500 resize-none h-16"
                      aria-label="Rejection reason" />
                    <button onClick={() => handleReview('rejected')} disabled={actionLoading || !rejectReason.trim()}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-slate-900 rounded-lg font-bold text-xs transition disabled:opacity-40">
                      ✗ Reject
                    </button>
                  </div>

                  <button onClick={() => handleReview('resubmit')} disabled={actionLoading}
                    className="w-full py-2.5 bg-yellow-600/20 border border-yellow-500/30 text-amber-500 rounded-xl font-bold text-xs hover:bg-yellow-600/30 transition disabled:opacity-40">
                    ↻ Request Resubmission
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KycReview;
