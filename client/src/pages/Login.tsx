import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { login } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { toast } from '../components/Toasts';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootChecked = useAuthStore((s) => s.bootChecked);

  // Куда вернуть после логина: /join/:token, /board/:id и т.д.
  const from = (location.state as { from?: string })?.from || '/';

  useEffect(() => {
    if (bootChecked && accessToken) {
      navigate(from, { replace: true });
    }
  }, [bootChecked, accessToken, navigate, from]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      setAuth(res.user, res.accessToken);
      toast.success(`Добро пожаловать, ${res.user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Not Miro</h1>
        <p className="subtitle">Войдите в свой аккаунт</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            required
            disabled={submitting}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={submitting}
          />
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="footer">
          Нет аккаунта? <Link to="/register" state={{ from }}>Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
}