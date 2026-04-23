/**
 * Portal Auth Store (Zustand)
 * Manages auth state, user profile, notifications, and session timeout.
 * JWT stored in httpOnly cookies (not localStorage).
 */
import { create } from 'zustand';

export interface PortalUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  status: 'pending_kyc' | 'active' | 'suspended' | 'blocked';
  dob?: string;
  kyc_status?: string;
  created_at?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface PortalAuthState {
  user: PortalUser | null;
  isAuthenticated: boolean;
  csrfToken: string | null;
  accessToken: string | null;
  notifications: Notification[];
  unreadCount: number;
  sessionExpiresAt: number | null;
  showSessionWarning: boolean;
  sidebarCollapsed: boolean;

  setAuth: (user: PortalUser, csrfToken: string, accessToken: string) => void;
  logout: () => void;
  setUser: (user: PortalUser) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setSessionExpiry: (expiresAt: number) => void;
  setShowSessionWarning: (show: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const usePortalAuth = create<PortalAuthState>((set) => ({
  user: JSON.parse(sessionStorage.getItem('portal_user') || 'null'),
  isAuthenticated: !!sessionStorage.getItem('portal_user'),
  csrfToken: sessionStorage.getItem('portal_csrf'),
  accessToken: sessionStorage.getItem('portal_token'),
  notifications: [],
  unreadCount: 0,
  sessionExpiresAt: null,
  showSessionWarning: false,
  sidebarCollapsed: false,

  setAuth: (user, csrfToken, accessToken) => {
    sessionStorage.setItem('portal_user', JSON.stringify(user));
    sessionStorage.setItem('portal_csrf', csrfToken);
    sessionStorage.setItem('portal_token', accessToken);
    // Sync with main app store
    localStorage.setItem('et_user', JSON.stringify(user));
    localStorage.setItem('et_token', accessToken);
    set({
      user,
      isAuthenticated: true,
      csrfToken,
      accessToken,
      sessionExpiresAt: Date.now() + 15 * 60 * 1000,
    });
  },

  logout: () => {
    sessionStorage.removeItem('portal_user');
    sessionStorage.removeItem('portal_csrf');
    sessionStorage.removeItem('portal_token');
    // Sync with main app store
    localStorage.removeItem('et_user');
    localStorage.removeItem('et_token');
    set({
      user: null,
      isAuthenticated: false,
      csrfToken: null,
      accessToken: null,
      sessionExpiresAt: null,
      showSessionWarning: false,
    });
  },

  setUser: (user) => {
    sessionStorage.setItem('portal_user', JSON.stringify(user));
    set({ user });
  },

  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setSessionExpiry: (expiresAt) => set({ sessionExpiresAt: expiresAt }),
  setShowSessionWarning: (show) => set({ showSessionWarning: show }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
