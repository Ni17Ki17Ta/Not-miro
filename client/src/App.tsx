import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
import { Toasts } from './components/Toasts';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  const bootChecked = useAuthStore((s) => s.bootChecked);
  
  // Пока проверяем сессию — показываем загрузку, чтобы не мигать логином
  if (!bootChecked) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: 16,
        color: '#666',
      }}>
        Загрузка...
      </div>
    );
  }
  
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  const bootChecked = useAuthStore((s) => s.bootChecked);
  
  if (!bootChecked) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: 16,
        color: '#666',
      }}>
        Загрузка...
      </div>
    );
  }
  
  return token ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  const tryRestore = useAuthStore((s) => s.tryRestore);

  useEffect(() => {
    // При первом запуске пробуем восстановить сессию через refresh-cookie.
    // Если cookie валидная — пользователь окажется залогинен без ввода пароля.
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