/**
 * User Portal Shell
 * - Left sidebar with user navigation
 * - Top navbar with alerts
 * - KYC gate and phishing warning banner
 */
import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { usePortalAuth } from '../store/usePortalAuth';
import { portalApi } from '../api/portalApi';

const UserDashboard = lazy(() => import('./user/UserDashboard'));
const UserProfile = lazy(() => import('./user/UserProfile'));
const UserSecurity = lazy(() => import('./user/UserSecurity'));
const UserKycStatus = lazy(() => import('./user/UserKycStatus'));
const UserNotifications = lazy(() => import('./user/UserNotifications'));

type UserSection = 'dashboard' | 'profile' | 'security' | 'kyc' | 'notifications';

const navItems: { id: UserSection; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'security', label: 'Security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { id: 'kyc', label: 'KYC Status', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
];

export const UserShell: React.FC = () => {
  const { user, logout, sidebarCollapsed, toggleSidebar } = usePortalAuth();
  const [activeSection, setActiveSection] = useState<UserSection>('dashboard');
  const [phishingWarning, setPhishingWarning] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>('');
  const [notifications, setNotifications] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [kycData, notifData] = await Promise.all([
        portalApi.getKycStatus(),
        portalApi.getNotifications(),
      ]);
      if (kycData) setKycStatus(kycData.status || 'not_submitted');
      if (notifData?.notifications) {
        setNotifications(notifData.notifications);
        const hasPhishing = notifData.notifications.some((n: any) => n.type === 'security' && !n.read);
        setPhishingWarning(hasPhishing);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = async () => {
    await portalApi.logout();
    logout();
    window.history.pushState({}, '', '/portal/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <UserDashboard />;
      case 'profile': return <UserProfile />;
      case 'security': return <UserSecurity />;
      case 'kyc': return <UserKycStatus />;
      case 'notifications': return <UserNotifications />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] italic flex font-sans text-slate-900">
      {/* Phishing Warning Banner */}
      {phishingWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500/10 border-b border-red-500/20 px-4 py-3 text-center backdrop-blur-md">
          <span className="text-red-400 text-sm font-medium flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Security Alert: A phishing threat was detected on your account.
            <button onClick={() => setActiveSection('notifications')} className="underline ml-2 hover:text-slate-900 font-black transition-colors">View Details</button>
          </span>
        </div>
      )}

      {/* KYC Banner */}
      {(kycStatus === 'pending' || kycStatus === 'rejected' || kycStatus === 'not_submitted') && (
        <div className={`fixed ${phishingWarning ? 'top-[45px]' : 'top-0'} left-0 right-0 z-40 px-4 py-3 text-center text-sm font-medium backdrop-blur-md ${
          kycStatus === 'rejected' ? 'bg-red-500/10 text-red-400 border-b border-red-500/20' :
          kycStatus === 'pending' ? 'bg-amber-500/10 text-amber-400 border-b border-amber-500/20' :
          'bg-blue-50 text-blue-600 border-b border-blue-200'
        }`}>
          <span className="flex items-center justify-center gap-2">
            {kycStatus === 'rejected' ? 'Action Required: Your KYC verification was rejected. Please resubmit.' :
             kycStatus === 'pending' ? 'KYC verification is under review. Some features may be restricted.' :
             'Action Required: Complete KYC verification to unlock all features.'}
            <button onClick={() => setActiveSection('kyc')} className="underline ml-2 hover:text-slate-900 font-black transition-colors">
              {kycStatus === 'not_submitted' ? 'Submit Now' : 'View Status'}
            </button>
          </span>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} shrink-0 bg-white border-r border-slate-100 flex flex-col transition-all duration-300 relative z-30 backdrop-blur-2xl ${phishingWarning || kycStatus !== 'approved' ? 'pt-12' : ''}`}>
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-inner">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <div className="text-sm font-semibold text-slate-900 font-black truncate">{user?.name || 'User'}</div>
                <div className="text-xs text-blue-600/80 font-medium truncate">Security Portal</div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSection === id
                  ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                  : 'text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-slate-200 hover:bg-slate-50 border border-transparent'
              }`}
              title={sidebarCollapsed ? label : undefined}
              aria-label={label}>
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
              </svg>
              {!sidebarCollapsed && (
                <span className="truncate flex items-center justify-between flex-1">
                  {label}
                  {id === 'notifications' && unreadCount > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-center justify-center font-bold">{unreadCount}</span>
                  )}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-blue-600 hover:text-cyan-300 hover:bg-blue-50 border border-blue-200 transition-all text-sm font-medium shadow-sm"
            title="Trading Terminal">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!sidebarCollapsed && 'Trading Terminal'}
          </button>
          
          <button onClick={toggleSidebar}
            className="w-full flex items-center justify-center py-2 rounded-lg text-slate-500 font-bold hover:text-slate-900 hover:bg-slate-50 transition-colors text-sm"
            aria-label={sidebarCollapsed ? 'Expand' : 'Collapse'}>
            <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-slate-500 font-bold hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto relative z-10 ${phishingWarning || kycStatus !== 'approved' ? 'pt-16' : ''}`}>
        {/* Subtle background glow for main area */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 p-6 md:p-8 min-h-full">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          }>
            {renderSection()}
          </Suspense>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.2); }
      `}</style>
    </div>
  );
};
