import { useEffect, useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { AdminApp } from './admin/AdminApp';
import { ProtectedRoute } from './components/ProtectedRoute';

import { PortalApp } from './portal/PortalApp';

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Redirect old auth routes to new portal auth routes
  useEffect(() => {
    if (path === '/login') {
      window.history.replaceState({}, '', '/portal/login');
      setPath('/portal/login');
    } else if (path === '/register') {
      window.history.replaceState({}, '', '/portal/register');
      setPath('/portal/register');
    } else if (path === '/admin/login') {
      window.history.replaceState({}, '', '/portal/admin/login');
      setPath('/portal/admin/login');
    }
  }, [path]);

  // Portal routes — handles its own routing inside
  if (path.startsWith('/portal')) {
    return <PortalApp />;
  }

  // Simple Router Switch (existing routes)
  const renderRoute = () => {
    if (path.startsWith('/admin')) {
      return (
        <ProtectedRoute adminOnly>
          <AdminApp />
        </ProtectedRoute>
      );
    }

    // Default: Protected Dashboard
    return (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    );
  };

  return (
    <div className="App selection:bg-indigo-500/30">
      {renderRoute()}
    </div>
  );
}

export default App;
