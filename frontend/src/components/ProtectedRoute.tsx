import React from 'react';
import { useStore } from '../store/useStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user } = useStore();

  const redirectTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (!isAuthenticated) {
    // If trying to access admin panel, go to admin login
    if (adminOnly || window.location.pathname.startsWith('/admin')) {
      redirectTo('/admin/login');
      return null;
    }
    // Otherwise go to standard login
    redirectTo('/login');
    return null;
  }

  if (adminOnly && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-10 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-red-500 border border-red-500/20">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 max-w-md">You do not have permission to access the administrative terminal. Please contact the security lead.</p>
        <button 
          onClick={() => redirectTo('/')}
          className="mt-8 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-all"
        >
          Return to Terminal
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
