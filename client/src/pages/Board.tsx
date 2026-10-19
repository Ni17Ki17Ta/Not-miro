import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBoard, getBoardByInvite } from '../api/boards';
import { getErrorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';
import { useBoardStore } from '../store/board';
import { useSocket } from '../hooks/useSocket';
import { useBoardSync } from '../hooks/useBoardSync';
import { useHotkeys } from '../hooks/useHotkeys';
import { Whiteboard } from '../components/Whiteboard';
import { Toolbar } from '../components/Toolbar';
import { ParticipantsPanel } from '../components/ParticipantsPanel';
import { ConnectionIndicator } from '../components/ConnectionIndicator';
import { BoardSettings } from '../components/BoardSettings';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { toast } from '../components/Toasts';
import type { Board as BoardType } from '../types';

export default function Board() {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const user = useAuthStore((s) => s.user);
  const viewport = useBoardStore((s) => s.viewport);
  const setViewport = useBoardStore((s) => s.setViewport);

  useSocket();
  const { sendOperation, sendCursor } = useBoardSync(board?.id || '', token);

  const history = useBoardStore((s) => s.history);
  const future = useBoardStore((s) => s.future);
  const undo = useBoardStore((s) => s.undo);
  const redo = useBoardStore((s) => s.redo);
  const clearElements = useBoardStore((s) => s.clearElements);
  const resetBoard = useBoardStore((s) => s.resetBoard);
  const isOwner = useBoardStore((s) => s.isOwner);

  useEffect(() => {
    return () => { resetBoard(); };
  }, [resetBoard]);

  useEffect(() => {
    resetBoard();
    // Явно сбрасываем viewport при входе на доску
    setViewport({ x: 0, y: 0, scale: 1 });
    setBoard(null);
    setError('');

    const load = async () => {
      try {
        const b = token ? await getBoardByInvite(token) : await getBoard(id!);
        setBoard(b);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    };
    void load();
  }, [id, token, resetBoard, setViewport]);

  const handleUndo = () => {
    const entry = undo();
    if (!entry) return;
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

  useHotkeys(handleUndo, handleRedo);

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
    return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Загрузка доски...</div>;
  }

  return (
    <div className="board-container">
      <div className="board-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ fontSize: 13, color: '#007bff', textDecoration: 'none' }}>← Мои доски</Link>
          <span className="title">{board.title}</span>
          {!isOwner && (
            <span style={{ fontSize: 11, padding: '2px 8px', background: '#fff3cd', color: '#856404', borderRadius: 10 }}>Гость</span>
          )}
        </div>
        <ConnectionIndicator />
      </div>

      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onOpenSettings={() => setShowSettings(true)}
        userId={user.id}
        boardId={board.id}
        viewport={viewport}
      />

      {showSettings && <BoardSettings onClose={() => setShowSettings(false)} />}

      <div style={{ position: 'absolute', top: 70, left: 20, zIndex: 10 }}>
        <ParticipantsPanel />
      </div>

      <PropertiesPanel sendOperation={sendOperation} />

      <Whiteboard
        sendOperation={sendOperation}
        sendCursor={sendCursor}
        userId={user.id}
        userName={user.name}
      />
    </div>
  );
}