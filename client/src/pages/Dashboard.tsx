import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import {
  getMyBoards,
  createBoard,
  deleteBoard,
  regenerateInvite,
  buildInviteUrl,
} from '../api/boards';
import { logout } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { toast } from '../components/Toasts';
import type { BoardListItem } from '../types';

export default function Dashboard() {
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const loadBoards = async () => {
    try {
      const list = await getMyBoards();
      setBoards(list);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoards();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const board = await createBoard(title.trim());
      setTitle('');
      toast.success(`Доска «${board.title}» создана`);
      navigate(`/board/${board.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (board: BoardListItem) => {
    try {
      await navigator.clipboard.writeText(buildInviteUrl(board.inviteToken));
      toast.success('Ссылка-приглашение скопирована в буфер');
    } catch {
      window.prompt('Скопируйте ссылку:', buildInviteUrl(board.inviteToken));
    }
  };

  const handleRegenerate = async (board: BoardListItem) => {
    if (!window.confirm('Старая ссылка перестанет работать. Продолжить?')) return;
    setBusyId(board.id);
    try {
      const res = await regenerateInvite(board.id);
      setBoards((prev) =>
        prev.map((b) =>
          b.id === board.id ? { ...b, inviteToken: res.inviteToken } : b,
        ),
      );
      toast.success('Новая ссылка сгенерирована');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (board: BoardListItem) => {
    if (!window.confirm(`Удалить доску «${board.title}»? Это действие необратимо.`)) {
      return;
    }
    setBusyId(board.id);
    try {
      await deleteBoard(board.id);
      setBoards((prev) => prev.filter((b) => b.id !== board.id));
      toast.success('Доска удалена');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Игнорируем
    }
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Мои доски</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#666' }}>{user?.name}</span>
          <button onClick={handleLogout} className="btn-secondary">
            Выйти
          </button>
        </div>
      </div>

      <form className="create-board-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Название новой доски"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          disabled={creating}
        />
        <button type="submit" className="btn-primary" disabled={creating || !title.trim()}>
          {creating ? 'Создание...' : 'Создать'}
        </button>
      </form>

      {loading ? (
        <div className="empty-state">Загрузка...</div>
      ) : boards.length === 0 ? (
        <div className="empty-state">
          <p>У вас пока нет досок.</p>
          <p>Создайте первую — это займёт секунду.</p>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((board) => (
            <div key={board.id} className="board-card" style={{ position: 'relative' }}>
              {/* Красный крестик удаления в правом верхнем углу */}
              <button
                onClick={() => handleDelete(board)}
                disabled={busyId === board.id}
                title="Удалить доску"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: '#e74c3c',
                  fontSize: 20,
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: 0,
                  opacity: busyId === board.id ? 0.4 : 1,
                  transition: 'color 0.15s, transform 0.1s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              >
                ×
              </button>

              <h3 title={board.title} style={{ paddingRight: 24 }}>{board.title}</h3>
              <div className="meta">
                Обновлено: {new Date(board.updatedAt).toLocaleDateString('ru-RU')}
              </div>
              <div className="actions">
                <Link to={`/board/${board.id}`} className="btn-secondary">
                  Открыть
                </Link>
                <button
                  onClick={() => handleInvite(board)}
                  className="btn-secondary"
                  title="Скопировать ссылку-приглашение"
                >
                  Пригласить
                </button>
                <button
                  onClick={() => handleRegenerate(board)}
                  className="btn-secondary"
                  disabled={busyId === board.id}
                  title="Сгенерировать новую ссылку (старая станет невалидной)"
                >
                  ↻
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}