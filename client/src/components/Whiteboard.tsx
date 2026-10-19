import { useRef, useState, useEffect } from 'react';
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

export function Whiteboard({ sendOperation, sendCursor, userId }: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftElement, setDraftElement] = useState<BoardElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });

  const [textInput, setTextInput] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
  } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const elementsMap = useBoardStore((s) => s.elements);
  const tool = useBoardStore((s) => s.tool);
  const color = useBoardStore((s) => s.color);
  const strokeWidth = useBoardStore((s) => s.strokeWidth);
  const fontSize = useBoardStore((s) => s.fontSize);
  const fontFamily = useBoardStore((s) => s.fontFamily);
  const selectedId = useBoardStore((s) => s.selectedId);
  const setSelected = useBoardStore((s) => s.setSelected);
  const addElement = useBoardStore((s) => s.addElement);
  const removeElement = useBoardStore((s) => s.removeElement);
  const pushHistory = useBoardStore((s) => s.pushHistory);
  const cursors = useBoardStore((s) => s.cursors);

  const elements = Array.from(elementsMap.values());

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (textInput && textInputRef.current) {
      setTimeout(() => textInputRef.current?.focus(), 50);
    }
  }, [textInput]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !textInput) {
        const el = elementsMap.get(selectedId);
        if (!el) return;
        if (el.createdBy !== userId) return;
        removeElement(selectedId);
        pushHistory({ type: 'remove', element: el });
        sendOperation({ type: 'remove', elementId: selectedId, createdBy: userId });
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, elementsMap, userId, removeElement, pushHistory, sendOperation, setSelected, textInput]);

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

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || e.evt.getModifierState?.(' ')) {
      setIsPanning(true);
      return;
    }

    if (tool === 'select') {
      if (e.target === e.target.getStage()) setSelected(null);
      return;
    }

    const pos = getPointerPos();
    if (!pos) return;

    if (tool === 'eraser') {
      setIsDrawing(true);
      return;
    }

    setIsDrawing(true);

    const id = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const base: BoardElement = {
      id,
      type: tool as ElementType,
      x: pos.x,
      y: pos.y,
      color,
      strokeWidth,
      fontSize,
      fontFamily,
      createdBy: userId,
      version: 1,
      updatedAt: Date.now(),
    };

    if (tool === 'pen') base.points = [pos.x, pos.y];
    if (tool === 'rect') {
      base.width = 0;
      base.height = 0;
    }
    if (tool === 'ellipse') base.radius = 0;
    if (tool === 'line') base.points = [pos.x, pos.y];
    if (tool === 'text') {
      base.width = 0;
      base.height = 0;
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
      setViewport((v) => ({ ...v, x: v.x + e.evt.movementX, y: v.y + e.evt.movementY }));
      return;
    }

    if (!isDrawing) return;

    if (tool === 'eraser') {
      const stage = stageRef.current;
      if (stage) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const shape = stage.getIntersection(pos);
          if (shape && shape.id()) {
            const idToRemove = shape.id();
            const el = elementsMap.get(idToRemove);
            if (el && el.createdBy === userId) {
              removeElement(idToRemove);
              pushHistory({ type: 'remove', element: el });
              sendOperation({ type: 'remove', elementId: idToRemove, createdBy: userId });
            }
          }
        }
      }
      return;
    }

    if (!draftElement) return;
    const pos = getPointerPos();
    if (!pos) return;

    const updated = { ...draftElement };

    if (tool === 'pen') {
      updated.points = [...(draftElement.points || []), pos.x, pos.y];
    } else if (tool === 'rect' || tool === 'text') {
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

    let shouldSave = true;
    if (draftElement.type === 'pen' && (draftElement.points?.length ?? 0) < 4) shouldSave = false;
    if (draftElement.type === 'rect' || draftElement.type === 'ellipse') {
      const w = Math.abs(draftElement.width || draftElement.radius || 0);
      const h = Math.abs(draftElement.height || draftElement.radius || 0);
      if (w < 5 && h < 5) shouldSave = false;
    }

    if (draftElement.type === 'text') {
      let w = Math.abs(draftElement.width || 0);
      let h = Math.abs(draftElement.height || 0);
      if (w < 20 || h < 20) {
        w = 200;
        h = 40;
      }
      setTextInput({
        x: draftElement.x,
        y: draftElement.y,
        width: w,
        height: h,
        text: '',
      });
      setDraftElement(null);
      setIsDrawing(false);
      return;
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
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  const finishTextInput = () => {
    if (!textInput) return;
    if (!textInput.text.trim()) {
      setTextInput(null);
      return;
    }

    const id = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const el: BoardElement = {
      id,
      type: 'text',
      x: textInput.x,
      y: textInput.y,
      width: textInput.width,
      height: textInput.height,
      text: textInput.text,
      fontSize,
      fontFamily,
      color,
      strokeWidth: 0,
      createdBy: userId,
      version: 1,
      updatedAt: Date.now(),
    };

    addElement(el);
    pushHistory({ type: 'add', element: el });
    sendOperation({ type: 'add', element: el });
    setTextInput(null);
  };

  const handleElementClick = (el: BoardElement) => {
    if (tool === 'select') setSelected(el.id);
  };

  const renderElement = (el: BoardElement, isDraft = false) => {
    const isSelected = el.id === selectedId;
    const glowColor = isDraft ? '#2ecc71' : isSelected ? '#007bff' : undefined;
    const glowBlur = isDraft ? 12 : isSelected ? 10 : 0;

    const commonProps = {
      key: el.id,
      id: el.id,
      onClick: () => handleElementClick(el),
      onTap: () => handleElementClick(el),
      opacity: isDraft ? 0.9 : 1,
      shadowColor: glowColor,
      shadowBlur: glowBlur,
      shadowOpacity: glowColor ? 0.8 : 0,
    };

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
        />
      );
    }
    if (el.type === 'text' && el.text) {
      return (
        <Text
          {...commonProps}
          x={el.x + 5}
          y={el.y + 5}
          text={el.text}
          fontSize={el.fontSize || 16}
          fontFamily={el.fontFamily || 'Arial'}
          fill={el.color}
          width={el.width ? Math.abs(el.width) - 10 : undefined}
        />
      );
    }
    return null;
  };

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
        style={{
          cursor: isPanning
            ? 'grabbing'
            : tool === 'select'
            ? 'default'
            : tool === 'eraser'
            ? 'cell'
            : 'crosshair',
        }}
      >
        <Layer>
          <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
            {elements.map((el) => renderElement(el))}
            {draftElement && renderElement(draftElement, true)}
          </Group>
        </Layer>

        <Layer listening={false}>
          {Array.from(cursors.values()).map((c) => {
            const sx = c.x * viewport.scale + viewport.x;
            const sy = c.y * viewport.scale + viewport.y;
            return (
              <Group key={c.socketId} x={sx} y={sy}>
                <Line points={[0, 0, 0, 16, 4, 12]} stroke={c.color} strokeWidth={2} fill={c.color} closed />
                <Rect x={6} y={18} width={c.userName.length * 7 + 12} height={20} fill={c.color} cornerRadius={4} />
                <Text x={12} y={22} text={c.userName} fontSize={12} fill="#fff" />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {textInput && (
        <div
          style={{
            position: 'absolute',
            top: textInput.y * viewport.scale + viewport.y,
            left: textInput.x * viewport.scale + viewport.x,
            width: textInput.width * viewport.scale,
            height: textInput.height * viewport.scale,
            zIndex: 100,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -2,
              border: '2px dashed #2ecc71',
              borderRadius: 4,
              pointerEvents: 'none',
            }}
          />
          <textarea
            ref={textInputRef}
            value={textInput.text}
            onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
            onBlur={finishTextInput}
            onKeyDown={(e) => {
              if (e.key === 'Escape') finishTextInput();
            }}
            style={{
              width: '100%',
              height: '100%',
              padding: '4px 6px',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: fontSize * viewport.scale,
              fontFamily,
              color,
              background: 'rgba(255,255,255,0.85)',
              lineHeight: 1.2,
              boxSizing: 'border-box',
            }}
            placeholder="Введите текст..."
          />
        </div>
      )}
    </div>
  );
}