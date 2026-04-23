/**
 * Portal App
 * Main router for the security portal (/portal/*)
 * Routes:
 *  /portal/login — User login
 *  /portal/register — User registration
 *  /portal/admin/login — Admin login
 *  /portal/admin/* — Admin shell (protected by AdminGuard)
 *  /portal/user/* — User shell (protected by AuthGuard + KycGate)
 */
import React, { useState, useEffect } from 'react';
import { AdminLogin } from './pages/AdminLogin';
import { UserLogin } from './pages/UserLogin';
import { UserRegister } from './pages/UserRegister';
import { AdminShell } from './pages/AdminShell';
import { UserShell } from './pages/UserShell';
import { AdminGuard, AuthGuard } from './guards/RouteGuards';
import { usePortalAuth } from './store/usePortalAuth';

export const PortalApp: React.FC = () => {
  const [path, setPath] = useState(window.location.pathname);
  const { isAuthenticated, user } = usePortalAuth();

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Route resolution
  const portalPath = path.replace(/^\/portal\/?/, '');

  // Redirects
  useEffect(() => {
    if ((portalPath === 'login' || portalPath === '') && isAuthenticated) {
      const dest = user?.role === 'admin' ? '/admin' : '/';
      window.history.replaceState({}, '', dest);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (portalPath === 'admin/login' && isAuthenticated && user?.role === 'admin') {
      window.history.replaceState({}, '', '/admin');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [portalPath, isAuthenticated, user?.role]);

  // Public routes
  if (portalPath === 'login' || portalPath === '') {
    if (isAuthenticated) return null;
    return <UserLogin />;
  }

  if (portalPath === 'register') {
    return <UserRegister />;
  }

  if (portalPath === 'admin/login') {
    if (isAuthenticated && user?.role === 'admin') return null;
    return <AdminLogin />;
  }

  // Protected admin routes
  if (portalPath.startsWith('admin')) {
    return (
      <AdminGuard>
        <AdminShell />
      </AdminGuard>
    );
  }

  // Protected user routes
  if (portalPath.startsWith('user')) {
    return (
      <AuthGuard>
        <UserShell />
      </AuthGuard>
    );
  }

  // Fallback: redirect to login
  return <UserLogin />;
};
