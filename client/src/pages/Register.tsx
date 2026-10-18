import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { register } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { toast } from '../components/Toasts';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов');
      return;
    }

    setSubmitting(true);
    try {
      const res = await register(email.trim(), password, name.trim());
      setAuth(res.user, res.accessToken);
      toast.success(`Аккаунт создан. Добро пожаловать, ${res.user.name}!`);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Регистрация</h1>
        <p className="subtitle">Создайте аккаунт Not Miro</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            autoFocus
            required
            minLength={1}
            maxLength={100}
            disabled={submitting}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={submitting}
          />
          <input
            type="password"
            placeholder="Пароль (минимум 8 символов)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={100}
            disabled={submitting}
          />
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Создание...' : 'Создать аккаунт'}
          </button>
        </form>

        <div className="footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </div>
    </div>
  );
}