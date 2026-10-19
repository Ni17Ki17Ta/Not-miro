import { useRef } from 'react';
import { useBoardStore } from '../store/board';
import type { Tool, LineStyle } from '../types';

const TOOLS: { id: Tool; label: string; icon: string; key: string }[] = [
  { id: 'select', label: 'Выделить', icon: '↖', key: 'V' },
  { id: 'hand', label: 'Рука (перемещение)', icon: '✋', key: 'H' },
  { id: 'pen', label: 'Карандаш', icon: '✏️', key: 'P' },
  { id: 'eraser', label: 'Ластик', icon: '🧽', key: 'E' },
  { id: 'rect', label: 'Прямоугольник', icon: '▭', key: 'R' },
  { id: 'ellipse', label: 'Эллипс', icon: '○', key: 'O' },
  { id: 'line', label: 'Линия', icon: '╱', key: 'L' },
  { id: 'text', label: 'Текст', icon: 'T', key: 'T' },
  { id: 'image', label: 'Картинка', icon: '🖼', key: 'I' },
];

const COLORS = ['#1a1a1a', '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
const LINE_STYLES: { id: LineStyle; label: string; icon: string }[] = [
  { id: 'solid', label: 'Сплошная', icon: '—' },
  { id: 'dashed', label: 'Пунктир', icon: '╍' },
  { id: 'dotted', label: 'Точки', icon: '┈' },
  { id: 'wavy', label: 'Волнистая', icon: '〰' },
];
const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
const FONT_SIZES = [12, 16, 20, 24, 32, 48];

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSettings: () => void;
  userId: string;
  viewport: { x: number; y: number; scale: number };
}

export function Toolbar({
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  onOpenSettings,
  userId,
  viewport,
}: ToolbarProps) {
  const tool = useBoardStore((s) => s.tool);
  const setTool = useBoardStore((s) => s.setTool);
  const color = useBoardStore((s) => s.color);
  const setColor = useBoardStore((s) => s.setColor);
  const strokeWidth = useBoardStore((s) => s.strokeWidth);
  const setStrokeWidth = useBoardStore((s) => s.setStrokeWidth);
  const lineStyle = useBoardStore((s) => s.lineStyle);
  const setLineStyle = useBoardStore((s) => s.setLineStyle);
  const fontSize = useBoardStore((s) => s.fontSize);
  const setFontSize = useBoardStore((s) => s.setFontSize);
  const fontFamily = useBoardStore((s) => s.fontFamily);
  const setFontFamily = useBoardStore((s) => s.setFontFamily);
  const isOwner = useBoardStore((s) => s.isOwner);
  const selectedId = useBoardStore((s) => s.selectedId);
  const elements = useBoardStore((s) => s.elements);
  const addElement = useBoardStore((s) => s.addElement);
  const pushHistory = useBoardStore((s) => s.pushHistory);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = selectedId ? elements.get(selectedId) : null;
  const isTextSelected = selectedElement?.type === 'text' || tool === 'text';

  // Сжатие картинки через canvas
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const MAX_DIM = 1000;
          let w = img.width;
          let h = img.height;
          if (w > MAX_DIM || h > MAX_DIM) {
            if (w > h) {
              h = (MAX_DIM / w) * h;
              w = MAX_DIM;
            } else {
              w = (MAX_DIM / h) * w;
              h = MAX_DIM;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('No canvas context'));
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = () => reject(new Error('Image load error'));
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const compressedBase64 = await compressImage(file);

      // Проверяем, что base64 не больше 2 МБ (чтобы не упасть на лимите сервера)
      if (compressedBase64.length > 2 * 1024 * 1024) {
        alert('Картинка слишком большая. Выберите изображение поменьше.');
        return;
      }

      // Получаем размеры для правильного отображения
      const img = new window.Image();
      img.src = compressedBase64;
      img.onload = () => {
        const maxW = 300;
        let w = img.width;
        let h = img.height;
        if (w > maxW) {
          h = (maxW / w) * h;
          w = maxW;
        }

        const centerX = (window.innerWidth / 2 - viewport.x) / viewport.scale;
        const centerY = (window.innerHeight / 2 - viewport.y) / viewport.scale;

        const newEl = {
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'image' as const,
          x: centerX - w / 2,
          y: centerY - h / 2,
          width: w,
          height: h,
          imageUrl: compressedBase64,
          color: '#000',
          strokeWidth: 0,
          zIndex: 0,
          createdBy: userId,
          version: 1,
          updatedAt: Date.now(),
        };
        addElement(newEl);
        pushHistory({ type: 'add', element: newEl });
      };
    } catch (err) {
      alert('Не удалось загрузить картинку');
      console.error(err);
    }
  };

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
          onClick={() => {
            setTool(t.id);
            if (t.id === 'image') fileInputRef.current?.click();
          }}
          style={btnStyle(tool === t.id)}
          title={`${t.label} (${t.key})`}
        >
          {t.icon}
        </button>
      ))}

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

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
          }}
          title={c}
        />
      ))}

      <label
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '2px solid #fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        title="Свой цвет"
      >
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{
            width: '150%',
            height: '150%',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            background: 'transparent',
          }}
        />
      </label>

      <div style={{ width: 1, height: 32, background: '#ddd', margin: '0 6px' }} />

      {LINE_STYLES.map((ls) => (
        <button
          key={ls.id}
          onClick={() => setLineStyle(ls.id)}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            background: lineStyle === ls.id ? '#e7f1ff' : 'transparent',
            border: lineStyle === ls.id ? '1px solid #007bff' : '1px solid transparent',
            fontSize: 20,
            color: '#333',
          }}
          title={ls.label}
        >
          {ls.icon}
        </button>
      ))}

      <div style={{ width: 1, height: 32, background: '#ddd', margin: '0 6px' }} />

      <input
        type="range"
        min={1}
        max={10}
        value={strokeWidth}
        onChange={(e) => setStrokeWidth(Number(e.target.value))}
        style={{ width: 80, cursor: 'pointer' }}
        title={`Толщина ${strokeWidth}px`}
      />

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

      <button onClick={onOpenSettings} style={{ ...btnStyle(false) }} title="Настройки доски">
        ⚙️
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