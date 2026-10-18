import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Text, Group } from 'react-konva';
import type Konva from 'konva';
import { useBoardStore } from '../store/board';
import type { BoardElement, ElementType, Operation } from '../types';

interface WhiteboardProps {
  sendOperation: (op: Operation) => void;
  sendCursor: (x: number, y: number) => void;
  userId: string;
  userName: string;
}

export function Whiteboard({ sendOperation, sendCursor, userId, userName }: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftElement, setDraftElement] = useState<BoardElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Viewport (pan/zoom)
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });

  // Zustand
  const elementsMap = useBoardStore((s) => s.elements);
  const tool = useBoardStore((s) => s.tool);
  const color = useBoardStore((s) => s.color);
  const strokeWidth = useBoardStore((s) => s.strokeWidth);
  const selectedId = useBoardStore((s) => s.selectedId);
  const setSelected = useBoardStore((s) => s.setSelected);
  const addElement = useBoardStore((s) => s.addElement);
  const updateElement = useBoardStore((s) => s.updateElement);
  const removeElement = useBoardStore((s) => s.removeElement);
  const clearElements = useBoardStore((s) => s.clearElements);
  const pushHistory = useBoardStore((s) => s.pushHistory);
  const cursors = useBoardStore((s) => s.cursors);

  const elements = Array.from(elementsMap.values());

  // ============ Ресайз окна ============

  useEffect(() => {
    const onResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ============ Delete выделенного ============

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const el = elementsMap.get(selectedId);
        if (!el) return;
        if (el.createdBy !== userId) return; // нельзя удалять чужое
        removeElement(selectedId);
        pushHistory({ type: 'remove', element: el });
        sendOperation({ type: 'remove', elementId: selectedId, createdBy: userId });
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, elementsMap, userId, removeElement, pushHistory, sendOperation, setSelected]);

  // ============ Координаты с учётом viewport ============

  const getPointerPos = (): { x: number; y: number } | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
  };

  // ============ Mouse handlers ============

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Panning средней кнопкой или пробелом (space)
    if (e.evt.button === 1 || e.evt.getModifierState?.(' ')) {
      setIsPanning(true);
      return;
    }

    if (tool === 'select') {
      // Клик по пустому месту — снять выделение
      if (e.target === e.target.getStage()) setSelected(null);
      return;
    }

    const pos = getPointerPos();
    if (!pos) return;

    setIsDrawing(true);

    const id = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const base: BoardElement = {
      id,
      type: tool as ElementType,
      x: pos.x,
      y: pos.y,
      color,
      strokeWidth,
      createdBy: userId,
      version: 1,
      updatedAt: Date.now(),
    };

    if (tool === 'pen') base.points = [pos.x, pos.y];
    if (tool === 'rect') {
      base.width = 0;
      base.height = 0;
    }
    if (tool === 'ellipse') {
      base.radius = 0;
    }
    if (tool === 'line') {
      base.points = [pos.x, pos.y];
    }
    if (tool === 'text') {
      const text = window.prompt('Введите текст:');
      if (!text) {
        setIsDrawing(false);
        return;
      }
      base.text = text;
      base.width = Math.max(80, text.length * 10);
      base.height = 30;
      addElement(base);
      pushHistory({ type: 'add', element: base });
      sendOperation({ type: 'add', element: base });
      setIsDrawing(false);
      return;
    }

    setDraftElement(base);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (stage) {
      const pointer = stage.getPointerPosition();
      if (pointer) {
        const pos = {
          x: (pointer.x - viewport.x) / viewport.scale,
          y: (pointer.y - viewport.y) / viewport.scale,
        };
        sendCursor(pos.x, pos.y);
      }
    }

    if (isPanning && stage) {
      const dx = e.evt.movementX;
      const dy = e.evt.movementY;
      setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      return;
    }

    if (!isDrawing || !draftElement) return;

    const pos = getPointerPos();
    if (!pos) return;

    const updated = { ...draftElement };

    if (tool === 'pen') {
      updated.points = [...(draftElement.points || []), pos.x, pos.y];
    } else if (tool === 'rect') {
      updated.width = pos.x - draftElement.x;
      updated.height = pos.y - draftElement.y;
    } else if (tool === 'ellipse') {
      const dx = pos.x - draftElement.x;
      const dy = pos.y - draftElement.y;
      updated.radius = Math.sqrt(dx * dx + dy * dy);
    } else if (tool === 'line') {
      updated.points = [draftElement.x, draftElement.y, pos.x, pos.y];
    }

    setDraftElement(updated);
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing || !draftElement) {
      setIsDrawing(false);
      return;
    }

    // Не сохраняем слишком маленькие элементы (случайный клик)
    let shouldSave = true;
    if (draftElement.type === 'pen' && (draftElement.points?.length ?? 0) < 4) {
      shouldSave = false;
    }
    if (draftElement.type === 'rect' || draftElement.type === 'ellipse') {
      const w = Math.abs(draftElement.width || draftElement.radius || 0);
      const h = Math.abs(draftElement.height || draftElement.radius || 0);
      if (w < 5 && h < 5) shouldSave = false;
    }

    if (shouldSave) {
      addElement(draftElement);
      pushHistory({ type: 'add', element: draftElement });
      sendOperation({ type: 'add', element: draftElement });
    }

    setDraftElement(null);
    setIsDrawing(false);
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = viewport.scale;
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.2, Math.min(4, newScale));

    const mousePointTo = {
      x: (pointer.x - viewport.x) / oldScale,
      y: (pointer.y - viewport.y) / oldScale,
    };

    setViewport({
      scale: clampedScale,
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - viewport.y * 0 - mousePointTo.y * clampedScale + viewport.y * 0,
    });
  };

  // ============ Клик на элемент (select) ============

  const handleElementClick = (el: BoardElement) => {
    if (tool === 'select') {
      setSelected(el.id);
    }
  };

  // ============ Рендер элемента ============

  const renderElement = (el: BoardElement, isDraft = false) => {
    const isSelected = el.id === selectedId;
    const commonProps = {
      key: el.id,
      onClick: () => handleElementClick(el),
      onTap: () => handleElementClick(el),
      opacity: isDraft ? 0.7 : 1,
    };

    const selectedShadow = isSelected ? 10 : 0;

    if (el.type === 'pen' && el.points) {
      return (
        <Line
          {...commonProps}
          points={el.points}
          stroke={el.color}
          strokeWidth={el.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.3}
          shadowColor={isSelected ? '#007bff' : undefined}
          shadowBlur={selectedShadow}
        />
      );
    }

    if (el.type === 'rect') {
      return (
        <Rect
          {...commonProps}
          x={el.x}
          y={el.y}
          width={el.width}
          height={el.height}
          stroke={el.color}
          strokeWidth={el.strokeWidth}
          fill="transparent"
          shadowColor={isSelected ? '#007bff' : undefined}
          shadowBlur={selectedShadow}
        />
      );
    }

    if (el.type === 'ellipse') {
      const r = el.radius || 0;
      return (
        <Ellipse
          {...commonProps}
          x={el.x + r}
          y={el.y + r}
          radiusX={Math.abs(r)}
          radiusY={Math.abs(r)}
          stroke={el.color}
          strokeWidth={el.strokeWidth}
          fill="transparent"
          shadowColor={isSelected ? '#007bff' : undefined}
          shadowBlur={selectedShadow}
        />
      );
    }

    if (el.type === 'line' && el.points) {
      return (
        <Line
          {...commonProps}
          points={el.points}
          stroke={el.color}
          strokeWidth={el.strokeWidth}
          lineCap="round"
          shadowColor={isSelected ? '#007bff' : undefined}
          shadowBlur={selectedShadow}
        />
      );
    }

    if (el.type === 'text' && el.text) {
      return (
        <Text
          {...commonProps}
          x={el.x}
          y={el.y}
          text={el.text}
          fontSize={16}
          fill={el.color}
          shadowColor={isSelected ? '#007bff' : undefined}
          shadowBlur={selectedShadow}
        />
      );
    }

    return null;
  };

  // ============ Рендер ============

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown as any}
        onTouchMove={handleMouseMove as any}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : tool === 'select' ? 'default' : 'crosshair' }}
      >
        <Layer>
          <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
            {/* Элементы */}
            {elements.map((el) => renderElement(el))}
            {/* Черновик */}
            {draftElement && renderElement(draftElement, true)}
          </Group>
        </Layer>

        {/* Курсоры других пользователей (не масштабируются) */}
        <Layer listening={false}>
          {Array.from(cursors.values()).map((c) => {
            const sx = c.x * viewport.scale + viewport.x;
            const sy = c.y * viewport.scale + viewport.y;
            return (
              <Group key={c.socketId} x={sx} y={sy}>
                <Line
                  points={[0, 0, 0, 16, 4, 12]}
                  stroke={c.color}
                  strokeWidth={2}
                  fill={c.color}
                  closed
                />
                <Rect
                  x={6}
                  y={18}
                  width={c.userName.length * 7 + 12}
                  height={20}
                  fill={c.color}
                  cornerRadius={4}
                />
                <Text
                  x={12}
                  y={22}
                  text={c.userName}
                  fontSize={12}
                  fill="#fff"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}