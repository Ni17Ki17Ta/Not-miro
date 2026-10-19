import { useBoardStore } from '../store/board';
import type { Tool } from '../types';

const TOOLS: { id: Tool; label: string; icon: string; key: string }[] = [
  { id: 'select', label: 'Выделить', icon: '↖', key: 'V' },
  { id: 'pen', label: 'Карандаш', icon: '✏️', key: 'P' },
  { id: 'eraser', label: 'Ластик', icon: '🧽', key: 'E' },
  { id: 'rect', label: 'Прямоугольник', icon: '▭', key: 'R' },
  { id: 'ellipse', label: 'Эллипс', icon: '○', key: 'O' },
  { id: 'line', label: 'Линия', icon: '╱', key: 'L' },
  { id: 'text', label: 'Текст', icon: 'T', key: 'T' },
];

const COLORS = ['#1a1a1a', '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
const STROKE_WIDTHS = [1, 2, 4, 8];
const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
const FONT_SIZES = [12, 16, 20, 24, 32, 48];

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Toolbar({ onUndo, onRedo, onClear, canUndo, canRedo }: ToolbarProps) {
  const tool = useBoardStore((s) => s.tool);
  const setTool = useBoardStore((s) => s.setTool);
  const color = useBoardStore((s) => s.color);
  const setColor = useBoardStore((s) => s.setColor);
  const strokeWidth = useBoardStore((s) => s.strokeWidth);
  const setStrokeWidth = useBoardStore((s) => s.setStrokeWidth);
  const fontSize = useBoardStore((s) => s.fontSize);
  const setFontSize = useBoardStore((s) => s.setFontSize);
  const fontFamily = useBoardStore((s) => s.fontFamily);
  const setFontFamily = useBoardStore((s) => s.setFontFamily);
  const isOwner = useBoardStore((s) => s.isOwner);
  const selectedId = useBoardStore((s) => s.selectedId);
  const elements = useBoardStore((s) => s.elements);

  const selectedElement = selectedId ? elements.get(selectedId) : null;
  const isTextSelected = selectedElement?.type === 'text' || tool === 'text';

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    fontSize: 18,
    background: active ? '#007bff' : '#f0f0f0',
    color: active ? '#fff' : '#333',
    transition: 'background 0.15s',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 70,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: 8,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
        zIndex: 10,
        flexWrap: 'wrap',
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      {TOOLS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          style={btnStyle(tool === t.id)}
          title={`${t.label} (${t.key})`}
        >
          {t.icon}
        </button>
      ))}

      <div style={{ width: 1, height: 32, background: '#ddd', margin: '0 6px' }} />

      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => setColor(c)}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: c,
            border: color === c ? '3px solid #333' : '2px solid #fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'transform 0.1s',
          }}
          title={c}
        />
      ))}

      <div style={{ width: 1, height: 32, background: '#ddd', margin: '0 6px' }} />

      {STROKE_WIDTHS.map((w) => (
        <button
          key={w}
          onClick={() => setStrokeWidth(w)}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            background: strokeWidth === w ? '#e7f1ff' : 'transparent',
            border: strokeWidth === w ? '1px solid #007bff' : '1px solid transparent',
          }}
          title={`Толщина ${w}px`}
        >
          <span
            style={{
              display: 'block',
              width: 20,
              height: w,
              background: '#333',
              borderRadius: w,
            }}
          />
        </button>
      ))}

      {isTextSelected && (
        <>
          <div style={{ width: 1, height: 32, background: '#ddd', margin: '0 6px' }} />
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}px
              </option>
            ))}
          </select>
        </>
      )}

      <div style={{ width: 1, height: 32, background: '#ddd', margin: '0 6px' }} />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={{ ...btnStyle(false), opacity: canUndo ? 1 : 0.4 }}
        title="Отменить (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        style={{ ...btnStyle(false), opacity: canRedo ? 1 : 0.4 }}
        title="Повторить (Ctrl+Y)"
      >
        ↷
      </button>
      {isOwner && (
        <button
          onClick={onClear}
          style={{
            padding: '0 12px',
            height: 40,
            borderRadius: 8,
            background: '#fee',
            color: '#c00',
            fontSize: 13,
            fontWeight: 500,
          }}
          title="Очистить доску"
        >
          Очистить
        </button>
      )}
    </div>
  );
}