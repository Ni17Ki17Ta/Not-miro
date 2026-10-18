import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBoard, getBoardByInvite } from '../api/boards';
import { getErrorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';
import { useBoardStore } from '../store/board';
import { useSocket } from '../hooks/useSocket';
import { useBoardSync } from '../hooks/useBoardSync';
import { Whiteboard } from '../components/Whiteboard';
import { Toolbar } from '../components/Toolbar';
import { ParticipantsPanel } from '../components/ParticipantsPanel';
import { ConnectionIndicator } from '../components/ConnectionIndicator';
import { toast } from '../components/Toasts';
import type { Board as BoardType } from '../types';

export default function Board() {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);

  // Хуки для сокетов (вызываются ВСЕГДА, чтобы соблюсти правила хуков)
  useSocket();

  // Синхронизация подключается только когда знаем boardId
  const { sendOperation, sendCursor } = useBoardSync(
    board?.id || '',
    token,
  );

  // Zustand история
  const history = useBoardStore((s) => s.history);
  const future = useBoardStore((s) => s.future);
  const undo = useBoardStore((s) => s.undo);
  const redo = useBoardStore((s) => s.redo);
  const clearElements = useBoardStore((s) => s.clearElements);
  const isOwner = useBoardStore((s) => s.isOwner);
  const elements = useBoardStore((s) => s.elements);

  // Загрузка доски
  useEffect(() => {
    const load = async () => {
      try {
        const b = token
          ? await getBoardByInvite(token)
          : await getBoard(id!);
        setBoard(b);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    };
    void load();
  }, [id, token]);

  // ============ Undo/Redo с синхронизацией ============

  const handleUndo = () => {
    const entry = undo();
    if (!entry) return;
    // Отправляем обратную операцию на сервер, чтобы откат был у всех
    if (entry.type === 'add') {
      sendOperation({ type: 'remove', elementId: entry.element.id, createdBy: user!.id });
    } else if (entry.type === 'remove') {
      sendOperation({ type: 'add', element: entry.element });
    }
  };

  const handleRedo = () => {
    const entry = redo();
    if (!entry) return;
    if (entry.type === 'add') {
      sendOperation({ type: 'add', element: entry.element });
    } else if (entry.type === 'remove') {
      sendOperation({ type: 'remove', elementId: entry.element.id, createdBy: user!.id });
    }
  };

  const handleClear = () => {
    if (!window.confirm('Очистить всю доску? Это действие нельзя отменить.')) return;
    clearElements();
    sendOperation({ type: 'clear', byUserId: user!.id });
    toast.info('Доска очищена');
  };

  // ============ Рендер состояний ============

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ color: '#c00', marginBottom: 16 }}>Ошибка</h2>
        <p style={{ marginBottom: 16 }}>{error}</p>
        <Link to="/" className="btn-secondary">← Вернуться к доскам</Link>
      </div>
    );
  }

  if (!board || !user) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
        Загрузка доски...
      </div>
    );
  }

  return (
    <div className="board-container">
      {/* Топбар */}
      <div className="board-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/"
            style={{ fontSize: 13, color: '#007bff', textDecoration: 'none' }}
          >
            ← Мои доски
          </Link>
          <span className="title">{board.title}</span>
          {!isOwner && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                background: '#fff3cd',
                color: '#856404',
                borderRadius: 10,
              }}
            >
              Гость
            </span>
          )}
        </div>
        <ConnectionIndicator />
      </div>

      {/* Панель инструментов */}
      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
      />

      {/* Участники (слева сверху под топбаром) */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 20,
          zIndex: 10,
        }}
      >
        <ParticipantsPanel />
      </div>

      {/* Холст */}
      <Whiteboard
        sendOperation={sendOperation}
        sendCursor={sendCursor}
        userId={user.id}
        userName={user.name}
      />
    </div>
  );
}