import { useBoardStore } from '../store/board';
import type { ConnectionState } from '../types';

const LABELS: Record<ConnectionState, string> = {
  connected: 'Онлайн',
  disconnected: 'Офлайн',
  connecting: 'Подключение...',
  reconnecting: 'Переподключение...',
};

const COLORS: Record<ConnectionState, string> = {
  connected: '#2ecc71',
  disconnected: '#e74c3c',
  connecting: '#f39c12',
  reconnecting: '#f39c12',
};

export function ConnectionIndicator() {
  const connection = useBoardStore((s) => s.connection);
  const color = COLORS[connection];
  const label = LABELS[connection];
  const isPulsing = connection === 'connecting' || connection === 'reconnecting';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        fontSize: 13,
        color: '#333',
        userSelect: 'none',
      }}
      title={label}
    >
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          animation: isPulsing ? 'pulse 1.4s ease-in-out infinite' : undefined,
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      {label}
    </div>
  );
}