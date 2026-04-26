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
    } else if (user?.role !== 'admin') {
      // Non-admin authenticated user — redirect to user area
      window.history.pushState({}, '', '/portal/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [isAuthenticated, user?.role]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
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
