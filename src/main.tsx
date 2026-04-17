import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import AuthPage from './pages/AuthPage.tsx';
import { useAuthStore } from './store/authStore.ts';
import { useEffect } from 'react';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, token, loadUser } = useAuthStore();

  useEffect(() => {
    if (token && !isAuthenticated) {
      loadUser();
    }
  }, []);

  // If we have a token but haven't verified yet, show loading
  if (token && isLoading) {
    return (
      <div className="h-screen w-full bg-[#e11d48] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-bold uppercase tracking-widest text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // No token or token invalid
  if (!token || (!isAuthenticated && !isLoading)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuthStore();

  // If already logged in, redirect to home
  if (token && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRouter() {
  const { token, isAuthenticated, loadUser } = useAuthStore();

  // Attempt to restore session on mount
  useEffect(() => {
    if (token && !isAuthenticated) {
      loadUser();
    }
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

const container = document.getElementById('root');

if (container) {
  // To completely avoid the "already passed to createRoot()" warning during 
  // hot reloads or multiple script executions, we replace the root element 
  // with a fresh clone before mounting. This ensures React always gets a 
  // pristine DOM node without any leftover internal state.
  const freshContainer = container.cloneNode(false) as HTMLElement;
  container.parentNode?.replaceChild(freshContainer, container);

  const root = createRoot(freshContainer);
  
  root.render(
    <StrictMode>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </StrictMode>,
  );
}
