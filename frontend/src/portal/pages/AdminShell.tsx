import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { usePortalAuth } from '../store/usePortalAuth';
import { portalApi } from '../api/portalApi';
import { Users, FileCheck, Activity, AlertTriangle, FileText, BarChart2, Settings as SettingsIcon, LogOut, ArrowRightLeft } from 'lucide-react';

// Lazy-loaded admin pages
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const UserManagement = lazy(() => import('./admin/UserManagement'));
const KycReview = lazy(() => import('./admin/KycReview'));
const ActivityLogs = lazy(() => import('./admin/ActivityLogs'));
const PhishingAlerts = lazy(() => import('./admin/PhishingAlerts'));
const SystemLogs = lazy(() => import('./admin/SystemLogs'));
const Reports = lazy(() => import('./admin/Reports'));
const Settings = lazy(() => import('./admin/AdminSettings'));

type AdminSection = 'dashboard' | 'users' | 'kyc' | 'activity' | 'phishing' | 'system-logs' | 'reports' | 'settings';

const navItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: <Activity size={14} /> },
  { id: 'users', label: 'User Management', icon: <Users size={14} /> },
  { id: 'kyc', label: 'KYC Review', icon: <FileCheck size={14} /> },
  { id: 'activity', label: 'Activity Logs', icon: <FileText size={14} /> },
  { id: 'phishing', label: 'Phishing Alerts', icon: <AlertTriangle size={14} /> },
  { id: 'system-logs', label: 'System Logs', icon: <Activity size={14} /> },
  { id: 'reports', label: 'Reports', icon: <BarChart2 size={14} /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon size={14} /> },
];

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64 bg-slate-50 border border-dashed border-slate-200 m-6">
    <div className="text-[10px] text-blue-600 font-black italic flex items-center gap-3">
      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      Loading Module...
    </div>
  </div>
);

export const AdminShell: React.FC = () => {
  const { user, logout, showSessionWarning, setShowSessionWarning, sessionExpiresAt } = usePortalAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Resize logic to match Dashboard.tsx
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('ps_admin_sidebar_width');
    return saved ? parseInt(saved) : 288;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = Math.min(Math.max(200, e.clientX), 450);
      setSidebarWidth(newWidth);
      localStorage.setItem('ps_admin_sidebar_width', newWidth.toString());
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      const data = await portalApi.getNotifications();
      if (data?.notifications) setNotifications(data.notifications);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadNotifications(); const i = setInterval(loadNotifications, 30000); return () => clearInterval(i); }, [loadNotifications]);

  const handleLogout = useCallback(async () => {
    await portalApi.logout();
    logout();
    window.history.pushState({}, '', '/portal/admin/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, [logout]);

  const extendSession = async () => {
    try {
      await portalApi.getMe();
      setShowSessionWarning(false);
    } catch {
      handleLogout();
    }
  };

  // Session timeout check
  useEffect(() => {
    const check = setInterval(() => {
      if (sessionExpiresAt) {
        const remaining = sessionExpiresAt - Date.now();
        if (remaining < 120000 && remaining > 0) {
          setShowSessionWarning(true);
        }
        if (remaining <= 0) {
          handleLogout();
        }
      }
    }, 10000);
    return () => clearInterval(check);
  }, [sessionExpiresAt, setShowSessionWarning, handleLogout]);

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <AdminDashboard />;
      case 'users': return <UserManagement />;
      case 'kyc': return <KycReview />;
      case 'activity': return <ActivityLogs />;
      case 'phishing': return <PhishingAlerts />;
      case 'system-logs': return <SystemLogs />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="h-screen bg-[#f8fafc] text-[#0f172a] flex overflow-hidden font-sans relative">
      
      {/* Sidebar matching Dashboard.tsx */}
      <aside 
        style={{ width: `${sidebarWidth}px` }}
        className="bg-white border-r border-slate-200 flex flex-col shrink-0 z-50 relative overflow-hidden"
      >
        {/* Branding */}
        <div className="p-8 pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 italic">
              ProfitSense AI
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              <span className="text-[10px] font-bold text-blue-600 italic">Admin Command</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-8">
          <div>
            <h3 className="text-[10px] text-slate-400 font-bold mb-4 pl-2 italic">Administrative Ops</h3>
            <div className="space-y-1">
              {navItems.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold transition-all border italic ${
                    activeSection === item.id 
                      ? 'bg-blue-50 border-blue-600 text-blue-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900 border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={activeSection === item.id ? 'text-blue-600' : 'opacity-50'}>{item.icon}</span>
                    {item.label}
                  </div>
                  {activeSection === item.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* User Status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }}
            className="w-full mb-3 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black transition-colors shadow-sm italic rounded-none border border-blue-700"
          >
            <ArrowRightLeft size={12} /> Trading Terminal
          </button>
          <div className="flex items-center justify-between p-3 border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-900 italic">{user?.name || user?.email?.split('@')[0]}</span>
              <span className="text-[8px] text-blue-600 font-bold italic">Admin Session</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              title="End Session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Resizer Handle */}
        <div 
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-600/10 active:bg-blue-600/20 transition-colors z-[60]"
        />
      </aside>

      {/* Main Command Area */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-[#f8fafc]">
        {/* Status Header */}
        <header className="h-10 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-40 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span className="text-[9px] text-green-600 font-bold italic">System Status: Operational</span>
            </div>
            <div className="text-[9px] text-blue-600 font-bold flex items-center gap-2 italic">
               Latency: 8ms
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-[9px] text-slate-400 font-bold italic">
              Active Module: {activeSection.replace('-', ' ')}
            </div>

            {/* Notification Bell */}
            <div className="relative border-l border-slate-200 pl-4">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-slate-400 hover:text-blue-600 transition-colors flex items-center"
              >
                <span className="text-[9px] font-bold italic mr-2">Alerts</span>
                <AlertTriangle size={14} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                )}
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-8 w-80 bg-white border border-slate-200 shadow-xl z-50">
                  <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-900 italic">Notifications</span>
                    <span className="text-[9px] text-slate-400 font-bold italic">{notifications.length} total</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-slate-400 text-sm font-bold italic text-center">No alerts active</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer ${!n.read ? 'bg-blue-50/50' : ''}`}>
                          <div className="text-[11px] font-black text-slate-900 italic tracking-wider">{n.title}</div>
                          <div className="text-[10px] text-slate-500 mt-1 font-bold italic">{n.message}</div>
                          <div className="text-[8px] text-slate-400 mt-2">{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 relative overflow-auto flex flex-col p-4 md:p-6">
           <Suspense fallback={<LoadingSpinner />}>
              <div className="bg-white border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col p-6">
                <h2 className="text-[14px] font-black text-slate-900 mb-6 flex items-center gap-3 italic border-b border-slate-100 pb-4">
                  <div className="w-2 h-2 bg-blue-600" />
                  {activeSection.replace('-', ' ')}
                </h2>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {renderSection()}
                </div>
              </div>
           </Suspense>
        </div>
        
        {/* Status Footer */}
        <footer className="h-8 bg-slate-900 border-t border-slate-800 flex items-center px-6 shrink-0 justify-between">
           <div className="flex items-center gap-4">
              <span className="text-[10px] text-blue-400 font-bold flex items-center gap-2 italic">
                 <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> Security Gateway: Armed
              </span>
              <div className="h-4 w-px bg-slate-800" />
              <span className="text-[10px] text-slate-500 font-bold italic">
                 Auth: JWT_STRICT
              </span>
           </div>
           <div className="text-[10px] text-slate-500 font-bold italic">
              v4.8.2-stable
           </div>
        </footer>
      </div>

      {/* Session Timeout Warning Modal */}
      {showSessionWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500" />
            
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-yellow-50 border border-yellow-200 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 text-center mb-2 tracking-tight italic">Session Expiring</h2>
            <p className="text-[10px] text-slate-500 font-bold text-center mb-8 italic leading-relaxed">
              Administrative session timeout imminent. Extension required to maintain access.
            </p>
            <div className="flex gap-4">
              <button onClick={handleLogout}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-colors border border-slate-200 italic">
                Terminate
              </button>
              <button onClick={extendSession}
                className="flex-1 py-3 bg-blue-600 text-white font-black text-sm hover:bg-blue-700 transition-colors shadow-sm italic">
                Re-Authorize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
