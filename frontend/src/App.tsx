import { useEffect, useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { AdminApp } from './admin/AdminApp';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminLoginStandalone } from './pages/AdminLoginStandalone';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useStore } from './store/useStore';

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const { isAuthenticated } = useStore();

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Simple Router Switch
  const renderRoute = () => {
    if (path === '/register' && !isAuthenticated) return <Register />;
    if (path === '/login' && !isAuthenticated) return <Login />;
    if (path === '/admin/login' && !isAuthenticated) return <AdminLoginStandalone />;
    
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
