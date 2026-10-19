import { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Text, Group, Image as KonvaImage, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useBoardStore } from '../store/board';
import type { BoardElement, ElementType, Operation } from '../types';

interface WhiteboardProps {
  sendOperation: (op: Operation) => void;
  sendCursor: (x: number, y: number) => void;
  userId: string;
  userName: string;
}

function getWavyPoints(points: number[], amplitude = 4, period = 20): number[] {
  if (points.length < 4) return points;
  const wavy: number[] = [];
  for (let i = 0; i < points.length - 2; i += 2) {
    const x1 = points[i], y1 = points[i + 1];
    const x2 = points[i + 2], y2 = points[i + 3];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    wavy.push(x1, y1);
    if (len < 1) continue;
    const nx = -dy / len, ny = dx / len;
    const steps = Math.max(2, Math.floor(len / 4));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const offset = Math.sin(t * Math.PI * 2 * (len / period)) * amplitude;
      wavy.push(x1 + dx * t + nx * offset, y1 + dy * t + ny * offset);
    }
  }
  wavy.push(points[points.length - 2], points[points.length - 1]);
  return wavy;
}

function KonvaImageElement({ el, commonProps }: { el: BoardElement; commonProps: any }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!el.imageUrl) return;
    const img = new window.Image();
    img.src = el.imageUrl;
    img.onload = () => setImage(img);
  }, [el.imageUrl]);
  if (!image) return null;
  return <KonvaImage {...commonProps} image={image} width={el.width} height={el.height} />;
}

// Треугольник
function TriangleShape({ el, commonProps }: { el: BoardElement; commonProps: any }) {
  const w = el.width || 0;
  const h = el.height || 0;
  return (
    <Line
      {...commonProps}
      points={[w / 2, 0, w, h, 0, h]}
      closed
      stroke={el.color}
      strokeWidth={el.strokeWidth}
      fill={el.fill || 'transparent'}
      dash={el.lineStyle === 'dashed' ? [10, 6] : el.lineStyle === 'dotted' ? [2, 6] : undefined}
    />
  );
}

// Ромб
function DiamondShape({ el, commonProps }: { el: BoardElement; commonProps: any }) {
  const w = el.width || 0;
  const h = el.height || 0;
  return (
    <Line
      {...commonProps}
      points={[w / 2, 0, w, h / 2, w / 2, h, 0, h / 2]}
      closed
      stroke={el.color}
      strokeWidth={el.strokeWidth}
      fill={el.fill || 'transparent'}
      dash={el.lineStyle === 'dashed' ? [10, 6] : el.lineStyle === 'dotted' ? [2, 6] : undefined}
    />
  );
}

// Звезда (5 лучей)
function StarShape({ el, commonProps }: { el: BoardElement; commonProps: any }) {
  const w = el.width || 0;
  const h = el.height || 0;
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR / 2.5;
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  return (
    <Line
      {...commonProps}
      points={pts}
      closed
      stroke={el.color}
      strokeWidth={el.strokeWidth}
      fill={el.fill || 'transparent'}
      dash={el.lineStyle === 'dashed' ? [10, 6] : el.lineStyle === 'dotted' ? [2, 6] : undefined}
    />
  );
}

export function Whiteboard({ sendOperation, sendCursor, userId }: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftElement, setDraftElement] = useState<BoardElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);

  // Групповое выделение
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const selectionStart = useRef<{ x: number; y: number } | null>(null);

  const [textInput, setTextInput] = useState<{ x: number; y: number; width: number; height: number; text: string } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const elementsMap = useBoardStore((s) => s.elements);
  const tool = useBoardStore((s) => s.tool);
  const color = useBoardStore((s) => s.color);
  const fillColor = useBoardStore((s) => s.fillColor);
  const strokeWidth = useBoardStore((s) => s.strokeWidth);
  const lineStyle = useBoardStore((s) => s.lineStyle);
  const fontSize = useBoardStore((s) => s.fontSize);
  const fontFamily = useBoardStore((s) => s.fontFamily);
  const selectedId = useBoardStore((s) => s.selectedId);
  const selectedIds = useBoardStore((s) => s.selectedIds);
  const setSelected = useBoardStore((s) => s.setSelected);
  const setSelectedIds = useBoardStore((s) => s.setSelectedIds);
  const addElement = useBoardStore((s) => s.addElement);
  const updateElement = useBoardStore((s) => s.updateElement);
  const removeElement = useBoardStore((s) => s.removeElement);
  const pushHistory = useBoardStore((s) => s.pushHistory);
  const cursors = useBoardStore((s) => s.cursors);
  const background = useBoardStore((s) => s.background);
  const viewport = useBoardStore((s) => s.viewport);
  const setViewport = useBoardStore((s) => s.setViewport);

  // zIndex: 1 — сверху, 10 — снизу.
  // При равных zIndex новее сверху (по updatedAt по убыванию).
  // Konva рисует по порядку — значит, первыми идут те, кто "снизу".
  const elements = Array.from(elementsMap.values()).sort((a, b) => {
    const za = a.zIndex ?? 5;
    const zb = b.zIndex ?? 5;
    if (za !== zb) return zb - za; // 10 первым (снизу), 1 последним (сверху)
    return a.updatedAt - b.updatedAt; // старые первыми (снизу), новые последними (сверху)
  });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ width: rect.width, height: rect.height });
      }
    };
    update();
    window.addEventListener('resize', update);
    const obs = new ResizeObserver(update);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => { window.removeEventListener('resize', update); obs.disconnect(); };
  }, []);

  useEffect(() => {
    if (textInput && textInputRef.current) setTimeout(() => textInputRef.current?.focus(), 50);
  }, [textInput]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0 && !textInput) {
        const target = e.target as HTMLElement;
        if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
        for (const sid of selectedIds) {
          const el = elementsMap.get(sid);
          if (!el || el.createdBy !== userId) continue;
          removeElement(sid);
          pushHistory({ type: 'remove', element: el });
          sendOperation({ type: 'remove', elementId: sid, createdBy: userId });
        }
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, elementsMap, userId, removeElement, pushHistory, sendOperation, setSelected, textInput]);

  useEffect(() => {
    if (trRef.current && stageRef.current && selectedId && tool === 'select') {
      const node = stageRef.current.findOne('#' + selectedId);
      if (node) { trRef.current.nodes([node]); trRef.current.getLayer()?.batchDraw(); }
      else trRef.current.nodes([]);
    } else if (trRef.current) trRef.current.nodes([]);
  }, [selectedId, elements, tool]);

  const getPointerPosFromEvent = (evt: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    let clientX = 0, clientY = 0;
    if ('touches' in evt && evt.touches.length > 0) {
      clientX = evt.touches[0].clientX; clientY = evt.touches[0].clientY;
    } else if ('changedTouches' in evt && evt.changedTouches.length > 0) {
      clientX = evt.changedTouches[0].clientX; clientY = evt.changedTouches[0].clientY;
    } else if ('clientX' in evt) {
      clientX = (evt as MouseEvent).clientX; clientY = (evt as MouseEvent).clientY;
    } else { return null; }
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    return {
      x: (localX - viewport.x) / viewport.scale,
      y: (localY - viewport.y) / viewport.scale,
    };
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'hand' || e.evt.button === 1 || e.evt.getModifierState?.(' ')) {
      setIsPanning(true);
      lastPanPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    if (tool === 'select') {
      // Клик на пустом месте — начинаем групповое выделение
      if (e.target === e.target.getStage()) {
        setSelected(null);
        const pos = getPointerPosFromEvent(e.evt as any);
        if (pos) {
          selectionStart.current = pos;
          setSelectionBox({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
        }
      }
      return;
    }

    const pos = getPointerPosFromEvent(e.evt as any);
    if (!pos) return;

    if (tool === 'eraser') { setIsDrawing(true); return; }
    setIsDrawing(true);

    const id = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const isPolyline = tool === 'pen' || tool === 'line' || tool === 'polyline';

    const base: BoardElement = {
      id, type: tool as ElementType,
      x: isPolyline ? 0 : pos.x,
      y: isPolyline ? 0 : pos.y,
      color, fill: fillColor, strokeWidth, lineStyle, fontSize, fontFamily,
      zIndex: 5,
      createdBy: userId, version: 1, updatedAt: Date.now(),
    };

    if (tool === 'pen' || tool === 'line' || tool === 'polyline') {
      base.points = [pos.x, pos.y];
    }
    if (['rect', 'ellipse', 'triangle', 'star', 'diamond', 'text'].includes(tool)) {
      base.width = 0; base.height = 0;
    }
    setDraftElement(base);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning && lastPanPos.current) {
      const dx = e.evt.clientX - lastPanPos.current.x;
      const dy = e.evt.clientY - lastPanPos.current.y;
      lastPanPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      setViewport((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      return;
    }

    const pos = getPointerPosFromEvent(e.evt as any);
    if (pos) sendCursor(pos.x, pos.y);

    // Групповое выделение
    if (tool === 'select' && selectionStart.current && pos) {
      setSelectionBox({
        x1: selectionStart.current.x, y1: selectionStart.current.y,
        x2: pos.x, y2: pos.y,
      });
      return;
    }

    if (!isDrawing) return;

    if (tool === 'eraser') {
      const stage = stageRef.current;
      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const shape = stage.getIntersection(pointer);
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

    if (!draftElement || !pos) return;

    const updated = { ...draftElement };
    if (tool === 'pen') {
      updated.points = [...(draftElement.points || []), pos.x, pos.y];
    } else if (tool === 'line') {
      const pts = draftElement.points || [0, 0];
      updated.points = [pts[0], pts[1], pos.x, pos.y];
    } else if (tool === 'polyline') {
      updated.points = [...(draftElement.points || []), pos.x, pos.y];
    } else if (tool === 'rect' || tool === 'text' || tool === 'triangle' || tool === 'star' || tool === 'diamond') {
      updated.width = pos.x - draftElement.x;
      updated.height = pos.y - draftElement.y;
    } else if (tool === 'ellipse') {
      const dx = pos.x - draftElement.x, dy = pos.y - draftElement.y;
      updated.radius = Math.sqrt(dx * dx + dy * dy);
    }
    setDraftElement(updated);
  };

  const handleMouseUp = () => {
    // Завершение группового выделения
    if (selectionStart.current && selectionBox) {
      const { x1, y1, x2, y2 } = selectionBox;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      if (Math.abs(maxX - minX) > 5 || Math.abs(maxY - minY) > 5) {
        const ids: string[] = [];
        for (const el of elements) {
          // Простая проверка: элемент в пределах рамки
          const ex = el.x || 0;
          const ey = el.y || 0;
          const ew = Math.abs(el.width || 0) || (el.points ? 0 : 10);
          const eh = Math.abs(el.height || 0) || (el.points ? 0 : 10);
          if (ex >= minX && ex <= maxX && ey >= minY && ey <= maxY) {
            ids.push(el.id);
          } else if (ex + ew >= minX && ex <= maxX && ey + eh >= minY && ey <= maxY) {
            ids.push(el.id);
          }
        }
        setSelectedIds(ids);
      }
      selectionStart.current = null;
      setSelectionBox(null);
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      lastPanPos.current = null;
      return;
    }
    if (!isDrawing || !draftElement) { setIsDrawing(false); return; }

    let shouldSave = true;
    if (draftElement.type === 'pen' && (draftElement.points?.length ?? 0) < 4) shouldSave = false;
    if (['rect', 'ellipse', 'triangle', 'star', 'diamond'].includes(draftElement.type)) {
      const w = Math.abs(draftElement.width || draftElement.radius || 0);
      const h = Math.abs(draftElement.height || draftElement.radius || 0);
      if (w < 5 && h < 5) shouldSave = false;
    }
    if (draftElement.type === 'text') {
      let w = Math.abs(draftElement.width || 0), h = Math.abs(draftElement.height || 0);
      if (w < 20 || h < 20) { w = 200; h = 40; }
      setTextInput({ x: draftElement.x, y: draftElement.y, width: w, height: h, text: '' });
      setDraftElement(null); setIsDrawing(false); return;
    }
    if (shouldSave) {
      addElement(draftElement);
      pushHistory({ type: 'add', element: draftElement });
      sendOperation({ type: 'add', element: draftElement });
    }
    setDraftElement(null); setIsDrawing(false);
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const localX = e.evt.clientX - rect.left;
    const localY = e.evt.clientY - rect.top;

    setViewport((prev) => {
      const oldScale = prev.scale;
      const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
      const clamped = Math.max(0.2, Math.min(4, newScale));
      const mousePointTo = {
        x: (localX - prev.x) / oldScale,
        y: (localY - prev.y) / oldScale,
      };
      return {
        scale: clamped,
        x: localX - mousePointTo.x * clamped,
        y: localY - mousePointTo.y * clamped,
      };
    });
  };

  const finishTextInput = () => {
    if (!textInput) return;
    if (!textInput.text.trim()) { setTextInput(null); return; }
    const id = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const el: BoardElement = {
      id, type: 'text', x: textInput.x, y: textInput.y,
      width: textInput.width, height: textInput.height, text: textInput.text,
      fontSize, fontFamily, color, strokeWidth: 0, zIndex: 5,
      createdBy: userId, version: 1, updatedAt: Date.now(),
    };
    addElement(el);
    pushHistory({ type: 'add', element: el });
    sendOperation({ type: 'add', element: el });
    setTextInput(null);
  };

  const handleElementClick = (e: Konva.KonvaEventObject<MouseEvent>, el: BoardElement) => {
    if (tool !== 'select') return;
    e.cancelBubble = true;
    if (e.evt.shiftKey) {
      const next = selectedIds.includes(el.id)
        ? selectedIds.filter((id) => id !== el.id)
        : [...selectedIds, el.id];
      setSelectedIds(next);
    } else {
      setSelected(el.id);
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, el: BoardElement) => {
    const node = e.target;
    if (el.type === 'pen' || el.type === 'line' || el.type === 'polyline') {
      const dx = node.x();
      const dy = node.y();
      const newPoints = (el.points || []).map((p, i) => p + (i % 2 === 0 ? dx : dy));
      const updated = { ...el, x: 0, y: 0, points: newPoints };
      node.x(0); node.y(0);
      updateElement(updated);
      pushHistory({ type: 'update', element: updated });
      sendOperation({ type: 'update', element: updated });
    } else {
      const updated = { ...el, x: node.x(), y: node.y() };
      updateElement(updated);
      pushHistory({ type: 'update', element: updated });
      sendOperation({ type: 'update', element: updated });
    }
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, el: BoardElement) => {
    const node = e.target;
    const scaleX = node.scaleX(), scaleY = node.scaleY();
    node.scaleX(1); node.scaleY(1);
    const updated = {
      ...el, x: node.x(), y: node.y(),
      width: Math.max(5, (el.width || 0) * scaleX),
      height: Math.max(5, (el.height || 0) * scaleY),
    };
    updateElement(updated);
    pushHistory({ type: 'update', element: updated });
    sendOperation({ type: 'update', element: updated });
  };

  const buildCommonProps = (el: BoardElement, isDraft: boolean) => {
    const isSelected = selectedIds.includes(el.id);
    const isHovered = hoveredId === el.id;
    const isEraserHover = tool === 'eraser' && isHovered;
    const isSelectHover = tool === 'select' && isHovered;
    const canInteract = tool === 'select' && el.createdBy === userId && !isDraft;

    let glowColor: string | undefined;
    let glowBlur = 0;
    if (isDraft) { glowColor = '#2ecc71'; glowBlur = 16; }
    else if (isEraserHover) { glowColor = '#ff6b6b'; glowBlur = 12; }
    else if (isSelected) { glowColor = '#2563eb'; glowBlur = 14; }
    else if (isSelectHover) { glowColor = '#60a5fa'; glowBlur = 8; }

    return {
      key: el.id, id: el.id, x: el.x, y: el.y,
      draggable: canInteract,
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleElementClick(e, el),
      onTap: (e: Konva.KonvaEventObject<MouseEvent>) => handleElementClick(e, el),
      onMouseEnter: () => setHoveredId(el.id),
      onMouseLeave: () => setHoveredId(null),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, el),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, el),
      opacity: isDraft ? 0.9 : 1,
      shadowColor: glowColor, shadowBlur: glowBlur,
      shadowOpacity: glowColor ? 1 : 0,
    };
  };

  const renderElement = (el: BoardElement, isDraft = false) => {
    const props = buildCommonProps(el, isDraft);
    const ls = el.lineStyle || 'solid';
    const dash = ls === 'dashed' ? [10, 6] : ls === 'dotted' ? [2, 6] : undefined;

    if (el.type === 'pen' && el.points) {
      let pts = el.points;
      if (ls === 'wavy' && pts.length > 4) pts = getWavyPoints(pts);
      return <Line {...props} points={pts} stroke={el.color} strokeWidth={el.strokeWidth} lineCap="round" lineJoin="round" dash={dash} tension={ls === 'wavy' ? 0 : 0.3} />;
    }
    if (el.type === 'polyline' && el.points) {
      return <Line {...props} points={el.points} stroke={el.color} strokeWidth={el.strokeWidth} lineCap="round" lineJoin="round" dash={dash} />;
    }
    if (el.type === 'rect') {
      return <Rect {...props} width={el.width} height={el.height} stroke={el.color} strokeWidth={el.strokeWidth} fill={el.fill || 'transparent'} dash={dash} />;
    }
    if (el.type === 'ellipse') {
      const r = el.radius || 0;
      return (
        <Ellipse {...props} x={el.x + r} y={el.y + r} radiusX={Math.abs(r)} radiusY={Math.abs(r)}
          stroke={el.color} strokeWidth={el.strokeWidth} fill={el.fill || 'transparent'} dash={dash}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            const node = e.target;
            const updated = { ...el, x: node.x() - r, y: node.y() - r };
            updateElement(updated);
            pushHistory({ type: 'update', element: updated });
            sendOperation({ type: 'update', element: updated });
          }}
        />
      );
    }
    if (el.type === 'triangle') {
      return <TriangleShape el={el} commonProps={props} />;
    }
    if (el.type === 'diamond') {
      return <DiamondShape el={el} commonProps={props} />;
    }
    if (el.type === 'star') {
      return <StarShape el={el} commonProps={props} />;
    }
    if (el.type === 'line' && el.points) {
      let pts = el.points;
      if (ls === 'wavy' && pts.length > 4) pts = getWavyPoints(pts);
      return <Line {...props} points={pts} stroke={el.color} strokeWidth={el.strokeWidth} lineCap="round" dash={dash} tension={ls === 'wavy' ? 0 : 0} />;
    }
    if (el.type === 'text' && el.text) {
      return <Text {...props} text={el.text} fontSize={el.fontSize || 16} fontFamily={el.fontFamily || 'Arial'} fill={el.color} width={el.width ? Math.abs(el.width) - 10 : undefined} padding={5} />;
    }
    if (el.type === 'image' && el.imageUrl) {
      return <KonvaImageElement key={el.id} el={el} commonProps={props} />;
    }
    return null;
  };

  const renderGrid = () => {
    if (background === 'plain') return null;
    const lines: JSX.Element[] = [];
    const GRID_SIZE = 20;
    const RANGE = 3000;

    if (background === 'light-grid' || background === 'dark-grid') {
      const stroke = background === 'light-grid' ? '#ddd' : '#555';
      for (let x = -RANGE; x <= RANGE; x += GRID_SIZE) {
        lines.push(<Line key={`v${x}`} points={[x, -RANGE, x, RANGE]} stroke={stroke} strokeWidth={0.5} listening={false} />);
      }
      for (let y = -RANGE; y <= RANGE; y += GRID_SIZE) {
        lines.push(<Line key={`h${y}`} points={[-RANGE, y, RANGE, y]} stroke={stroke} strokeWidth={0.5} listening={false} />);
      }
    }
    if (background === 'dots') {
      for (let x = -RANGE; x <= RANGE; x += 40) {
        for (let y = -RANGE; y <= RANGE; y += 40) {
          lines.push(<Rect key={`d${x}-${y}`} x={x} y={y} width={2} height={2} fill="#bbb" listening={false} />);
        }
      }
    }
    if (background === 'lines') {
      for (let y = -RANGE; y <= RANGE; y += GRID_SIZE) {
        lines.push(<Line key={`h${y}`} points={[-RANGE, y, RANGE, y]} stroke="#ddd" strokeWidth={0.5} listening={false} />);
      }
    }
    return lines;
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        position: 'absolute', top: 0, left: 0,
        overflow: 'hidden',
        backgroundColor: background === 'dark-grid' ? '#333' : '#fafafa',
      }}
    >
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
          cursor: isPanning ? 'grabbing'
            : tool === 'hand' ? 'grab'
            : tool === 'select' ? 'default'
            : tool === 'eraser' ? 'cell'
            : 'crosshair',
        }}
      >
        <Layer listening={false}>
          <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
            {renderGrid()}
          </Group>
        </Layer>

        <Layer>
          <Group x={viewport.x} y={viewport.y} scaleX={viewport.scale} scaleY={viewport.scale}>
            {elements.map((el) => renderElement(el))}
            {draftElement && renderElement(draftElement, true)}

            {/* Рамка выделения */}
            {selectionBox && (
              <Rect
                x={Math.min(selectionBox.x1, selectionBox.x2)}
                y={Math.min(selectionBox.y1, selectionBox.y2)}
                width={Math.abs(selectionBox.x2 - selectionBox.x1)}
                height={Math.abs(selectionBox.y2 - selectionBox.y1)}
                stroke="#2563eb"
                strokeWidth={1}
                dash={[4, 4]}
                fill="rgba(37, 99, 235, 0.1)"
                listening={false}
              />
            )}
          </Group>
        </Layer>

        <Layer>
          {selectedId && tool === 'select' && (
            <Transformer
              ref={trRef}
              rotateEnabled={false}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)}
            />
          )}
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
          <div style={{ position: 'absolute', inset: -2, border: '2px dashed #2ecc71', borderRadius: 4, pointerEvents: 'none' }} />
          <textarea
            ref={textInputRef}
            value={textInput.text}
            onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
            onBlur={finishTextInput}
            onKeyDown={(e) => { if (e.key === 'Escape') finishTextInput(); }}
            style={{
              width: '100%', height: '100%', padding: '4px 6px',
              border: 'none', outline: 'none', resize: 'none',
              fontSize: fontSize * viewport.scale, fontFamily, color,
              background: 'rgba(255,255,255,0.85)', lineHeight: 1.2, boxSizing: 'border-box',
            }}
            placeholder="Введите текст..."
          />
        </div>
      )}
    </div>
  );
}