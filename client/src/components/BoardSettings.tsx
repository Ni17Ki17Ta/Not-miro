import { useBoardStore } from '../store/board';
import type { BoardBackground } from '../types';

interface BoardSettingsProps {
  onClose: () => void;
}

const BACKGROUNDS: { id: BoardBackground; label: string; preview: string }[] = [
  { id: 'light-grid', label: 'Светлая клетка', preview: 'linear-gradient(90deg, #eee 1px, transparent 1px), linear-gradient(#eee 1px, transparent 1px)' },
  { id: 'dark-grid', label: 'Тёмная клетка', preview: 'linear-gradient(90deg, #333 1px, transparent 1px), linear-gradient(#333 1px, transparent 1px)' },
  { id: 'dots', label: 'Точки', preview: 'radial-gradient(#ccc 1px, transparent 1px)' },
  { id: 'lines', label: 'Линии', preview: 'linear-gradient(#eee 1px, transparent 1px)' },
  { id: 'plain', label: 'Без фона', preview: '#fafafa' },
];

export function BoardSettings({ onClose }: BoardSettingsProps) {
  const background = useBoardStore((s) => s.background);
  const setBackground = useBoardStore((s) => s.setBackground);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 24, width: 400, maxWidth: '90vw',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Настройки доски</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>Фон</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setBackground(bg.id)}
                style={{
                  padding: 12, borderRadius: 8,
                  border: background === bg.id ? '2px solid #007bff' : '1px solid #ddd',
                  background: bg.preview,
                  backgroundSize: bg.id === 'dots' ? '20px 20px' : '20px 20px',
                  cursor: 'pointer',
                  height: 80,
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
                }}
              >
                <span style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>{bg.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}