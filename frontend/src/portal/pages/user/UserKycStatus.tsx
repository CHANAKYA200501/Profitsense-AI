import React, { useState, useEffect } from 'react';
import { portalApi } from '../../api/portalApi';

const UserKycStatus: React.FC = () => {
  const [kycData, setKycData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('passport');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    portalApi.getKycStatus().then(d => { setKycData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);
      formData.append('full_name', '');
      const res = await portalApi.submitKyc(formData);
      if (res.status === 'success') {
        setMessage('KYC submitted successfully. It will be reviewed shortly.');
        setFile(null);
        // Refresh
        const d = await portalApi.getKycStatus();
        setKycData(d);
      } else {
        setMessage(res.detail || 'Submission failed');
      }
    } catch { setMessage('Upload failed'); }
    setSubmitting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  const latestStatus = kycData?.submissions?.length > 0 ? kycData.submissions[kycData.submissions.length - 1].status : 'not_submitted';
  const canSubmit = latestStatus !== 'pending' && latestStatus !== 'approved';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Current Status */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">KYC Verification Status</h3>
        <div className={`p-4 rounded-xl border ${
          latestStatus === 'approved' ? 'bg-emerald-50 border-emerald-200' :
          latestStatus === 'pending' ? 'bg-amber-50 border-amber-200' :
          latestStatus === 'rejected' ? 'bg-red-50 border-red-500/20' :
          'bg-slate-50 border-gray-700/30'
        }`}>
          <div className={`text-lg font-black ${
            latestStatus === 'approved' ? 'text-emerald-600' :
            latestStatus === 'pending' ? 'text-amber-500' :
            latestStatus === 'rejected' ? 'text-red-600' :
            'text-slate-500'
          }`}>
            {latestStatus === 'approved' ? '✓ Verified' :
             latestStatus === 'pending' ? '⏳ Under Review' :
             latestStatus === 'rejected' ? '✗ Rejected' :
             '○ Not Submitted'}
          </div>
          {latestStatus === 'rejected' && kycData.submissions?.length > 0 && (
            <div className="text-sm text-red-300 mt-2">
              Reason: {kycData.submissions[kycData.submissions.length - 1].rejection_reason || 'Please resubmit with valid documents'}
            </div>
          )}
        </div>
      </div>

      {/* Submission History */}
      {kycData?.submissions?.length > 0 && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">Submission History</h3>
          <div className="space-y-2">
            {kycData.submissions.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-100/20 rounded-xl text-xs">
                <div>
                  <span className="text-slate-900 font-medium">{s.document_type?.replace('_', ' ')}</span>
                  <span className="text-slate-400 ml-3">{new Date(s.submitted_at).toLocaleDateString()}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-sm font-bold ${
                  s.status === 'approved' ? 'bg-green-500/15 text-emerald-600' :
                  s.status === 'pending' ? 'bg-yellow-500/15 text-amber-500' :
                  'bg-red-500/15 text-red-600'
                }`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit New */}
      {canSubmit && (
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-900 tracking-wider mb-4">
            {latestStatus === 'rejected' ? 'Resubmit KYC' : 'Submit KYC Documents'}
          </h3>
          <div className="space-y-4">
            <select value={docType} onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-slate-100/60 border border-gray-700/50 rounded-xl px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-cyan-500">
              <option value="passport">Passport</option>
              <option value="drivers_license">Driver's License</option>
              <option value="national_id">National ID</option>
              <option value="aadhar">Aadhaar Card</option>
            </select>

            <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition hover:border-blue-300 ${
              file ? 'border-green-500/30 bg-green-500/5' : 'border-gray-700/50'
            }`} onClick={() => document.getElementById('kyc-reupload')?.click()}>
              <input id="kyc-reupload" type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <div className="text-emerald-600"><p className="font-medium">{file.name}</p><p className="text-[10px] text-slate-400 mt-1">{(file.size/1024/1024).toFixed(2)} MB</p></div>
              ) : (
                <div className="text-slate-400"><p className="text-sm">Click to upload document</p><p className="text-[10px] mt-1">JPG, PNG, or PDF (max 5MB)</p></div>
              )}
            </div>

            {message && <div className={`p-3 rounded-xl text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-500/20'}`}>{message}</div>}

            <button onClick={handleSubmit} disabled={!file || submitting}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-900 rounded-xl font-bold text-sm transition disabled:opacity-40">
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserKycStatus;
