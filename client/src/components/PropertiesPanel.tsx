import { useBoardStore } from '../store/board';
import type { LineStyle, Operation, BoardElement } from '../types';

const COLORS = ['#1a1a1a', '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#ffffff'];
const LINE_STYLES: { id: LineStyle; label: string; icon: string }[] = [
  { id: 'solid', label: 'Сплошная', icon: '—' },
  { id: 'dashed', label: 'Пунктир', icon: '╍' },
  { id: 'dotted', label: 'Точки', icon: '┈' },
  { id: 'wavy', label: 'Волнистая', icon: '〰' },
];
const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
const FONT_SIZES = [12, 16, 20, 24, 32, 48];

interface PropertiesPanelProps {
  sendOperation: (op: Operation) => void;
}

export function PropertiesPanel({ sendOperation }: PropertiesPanelProps) {
  const selectedId = useBoardStore((s) => s.selectedId);
  const elements = useBoardStore((s) => s.elements);
  const updateElement = useBoardStore((s) => s.updateElement);
  const pushHistory = useBoardStore((s) => s.pushHistory);
  const removeElement = useBoardStore((s) => s.removeElement);
  const bringToFront = useBoardStore((s) => s.bringToFront);

  const el = selectedId ? elements.get(selectedId) : null;

  if (!el) return null;

  const handleUpdate = (changes: Partial<BoardElement>) => {
    const updated = { ...el, ...changes };
    updateElement(updated);
    pushHistory({ type: 'update', element: updated });
    sendOperation({ type: 'update', element: updated });
  };

  const handleDelete = () => {
    removeElement(el.id);
    pushHistory({ type: 'remove', element: el });
    sendOperation({ type: 'remove', elementId: el.id, createdBy: el.createdBy });
  };

  const handleBringFront = () => {
    bringToFront(el.id);
  };

  const isText = el.type === 'text';
  const isShape = ['rect', 'ellipse'].includes(el.type);

  return (
    <div style={{
      position: 'absolute',
      top: 70,
      right: 20,
      width: 280,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      padding: 16,
      zIndex: 100,
      maxHeight: 'calc(100vh - 90px)',
      overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#333' }}>
          {isText ? 'Текст' : el.type === 'image' ? 'Картинка' : 'Фигура'}
        </h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleBringFront} style={{ background: '#f0f0f0', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }} title="На передний план">⬆️</button>
          <button onClick={handleDelete} style={{ background: '#fee', color: '#c00', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }} title="Удалить">🗑</button>
        </div>
      </div>

      {/* Цвет контура */}
      {!isText && el.type !== 'image' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Цвет контура</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleUpdate({ color: c })}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c,
                  border: el.color === c ? '3px solid #007bff' : '1px solid #ddd',
                  cursor: 'pointer',
                }}
              />
            ))}
            <input type="color" value={el.color} onChange={(e) => handleUpdate({ color: e.target.value })}
              style={{ width: 24, height: 24, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} />
          </div>
        </div>
      )}

      {/* Цвет текста */}
      {isText && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Цвет текста</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {COLORS.map((c) => (
              <button key={c} onClick={() => handleUpdate({ color: c })}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c,
                  border: el.color === c ? '3px solid #007bff' : '1px solid #ddd',
                  cursor: 'pointer',
                }} />
            ))}
            <input type="color" value={el.color} onChange={(e) => handleUpdate({ color: e.target.value })}
              style={{ width: 24, height: 24, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} />
          </div>
        </div>
      )}

      {/* Заливка */}
      {isShape && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Заливка</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button onClick={() => handleUpdate({ fill: 'transparent' })}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 50% / 8px 8px',
                border: el.fill === 'transparent' ? '3px solid #007bff' : '1px solid #ddd',
                cursor: 'pointer',
              }} title="Без заливки" />
            {COLORS.filter(c => c !== '#ffffff').map((c) => (
              <button key={c} onClick={() => handleUpdate({ fill: c })}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c,
                  border: el.fill === c ? '3px solid #007bff' : '1px solid #ddd',
                  cursor: 'pointer',
                }} />
            ))}
            <input type="color" value={el.fill === 'transparent' ? '#ffffff' : el.fill}
              onChange={(e) => handleUpdate({ fill: e.target.value })}
              style={{ width: 24, height: 24, border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }} />
          </div>
        </div>
      )}

      {/* Толщина */}
      {!isText && el.type !== 'image' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Толщина контура: {el.strokeWidth}px</div>
          <input type="range" min={1} max={10} value={el.strokeWidth}
            onChange={(e) => handleUpdate({ strokeWidth: Number(e.target.value) })}
            style={{ width: '100%' }} />
        </div>
      )}

      {/* Стиль линии */}
      {!isText && el.type !== 'image' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Стиль линии</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {LINE_STYLES.map((ls) => (
              <button key={ls.id} onClick={() => handleUpdate({ lineStyle: ls.id })}
                style={{
                  flex: 1, height: 32, borderRadius: 6,
                  background: el.lineStyle === ls.id ? '#e7f1ff' : '#f5f5f5',
                  border: el.lineStyle === ls.id ? '1px solid #007bff' : '1px solid transparent',
                  fontSize: 18, cursor: 'pointer',
                }} title={ls.label}>
                {ls.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Настройки текста */}
      {isText && (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Шрифт</div>
            <select value={el.fontFamily || 'Arial'} onChange={(e) => handleUpdate({ fontFamily: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Размер</div>
            <select value={el.fontSize || 16} onChange={(e) => handleUpdate({ fontSize: Number(e.target.value) })}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
              {FONT_SIZES.map((s) => <option key={s} value={s}>{s}px</option>)}
            </select>
          </div>
        </>
      )}
    </div>
  );
}