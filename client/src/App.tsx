import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
import { Toasts } from './components/Toasts';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootChecked = useAuthStore((s) => s.bootChecked);
  const location = useLocation();

  // Пока идёт восстановление сессии — показываем загрузку
  if (!bootChecked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontSize: 16, color: '#666',
      }}>
        Загрузка...
      </div>
    );
  }

  // Если токена нет — на логин с сохранением URL
  return accessToken
    ? <>{children}</>
    : <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootChecked = useAuthStore((s) => s.bootChecked);
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';

  if (!bootChecked) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontSize: 16, color: '#666',
      }}>
        Загрузка...
      </div>
    );
  }

  // Если уже авторизован — на исходный URL (например /join/:token)
  return accessToken ? <Navigate to={from} replace /> : <>{children}</>;
}

export default function App() {
  const tryRestore = useAuthStore((s) => s.tryRestore);

  useEffect(() => {
    void tryRestore();
  }, [tryRestore]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/board/:id" element={<PrivateRoute><Board /></PrivateRoute>} />
        <Route path="/join/:token" element={<PrivateRoute><Board /></PrivateRoute>} />
        <Route
          path="*"
          element={
            <div style={{ padding: 40, textAlign: 'center' }}>
              <h1>404</h1>
              <p>Страница не найдена</p>
              <Link to="/">На главную</Link>
            </div>
          }
        />
      </Routes>
      <Toasts />
    </>
  );
}