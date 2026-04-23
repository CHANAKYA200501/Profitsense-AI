/**
 * Route Guards for Portal
 * - AdminGuard: redirects non-admin to /portal/admin/login
 * - AuthGuard: redirects unauthenticated to /portal/login
 * - KycGate: blocks access if KYC is pending/rejected
 */
import React, { useEffect, useState } from 'react';
import { usePortalAuth } from '../store/usePortalAuth';
import { portalApi } from '../api/portalApi';

interface GuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, user } = usePortalAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      window.history.pushState({}, '', '/portal/admin/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#060918] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Admin Access Required</h1>
          <p className="text-gray-400 text-sm mb-8">This area is restricted to administrators.</p>
          <button
            onClick={() => { window.history.pushState({}, '', '/portal/login'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const AuthGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated } = usePortalAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      window.history.pushState({}, '', '/portal/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export const KycGate: React.FC<GuardProps> = ({ children }) => {
  const { user, isAuthenticated } = usePortalAuth();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    portalApi.getKycStatus().then((data) => {
      if (data?.status === 'success') {
        setKycStatus(data.status === 'approved' ? 'approved' : data.status);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060918] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.status === 'pending_kyc' || kycStatus === 'pending' || kycStatus === 'rejected' || kycStatus === 'not_submitted') {
    return (
      <div className="min-h-screen bg-[#060918]">
        {/* KYC Status Banner */}
        <div className={`px-4 py-3 text-center text-sm font-medium ${
          kycStatus === 'rejected' 
            ? 'bg-red-500/10 text-red-400 border-b border-red-500/20'
            : 'bg-yellow-500/10 text-yellow-400 border-b border-yellow-500/20'
        }`}>
          {kycStatus === 'rejected' 
            ? '⚠️ Your KYC verification was rejected. Please resubmit your documents.'
            : kycStatus === 'pending'
            ? '⏳ Your KYC is under review. Access to features is limited.'
            : '📋 Please complete KYC verification to access all features.'}
          <button
            onClick={() => { window.history.pushState({}, '', '/portal/user/kyc'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            className="ml-3 underline hover:text-white transition"
          >
            {kycStatus === 'not_submitted' ? 'Submit KYC' : 'View Status'}
          </button>
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
};
