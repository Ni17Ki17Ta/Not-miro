import { prisma } from '../prisma.js';
import { logger } from '../logger.js';

// ============ Типы ============

export type ElementType = 'pen' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'sticky';

export interface BoardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  points?: number[];
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  createdBy: string;
  version: number;
  updatedAt: number;
}

export type Operation =
  | { type: 'add'; element: BoardElement }
  | { type: 'update'; element: BoardElement }
  | { type: 'remove'; elementId: string; createdBy: string }
  | { type: 'clear'; byUserId: string };

interface BoardEntry {
  elements: Map<string, BoardElement>;
  dirty: boolean;
  saveTimer: NodeJS.Timeout | null;
}

// ============ In-memory хранилище ============

const activeBoards = new Map<string, BoardEntry>();

const SAVE_DEBOUNCE_MS = 2000;

// ============ Загрузка с сервера при первом обращении ============

async function loadElements(boardId: string): Promise<Map<string, BoardElement>> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { elements: true },
  });

  const map = new Map<string, BoardElement>();
  if (!board) return map;

  try {
    const parsed = JSON.parse(board.elements);
    if (Array.isArray(parsed)) {
      for (const el of parsed) {
        if (el && typeof el === 'object' && 'id' in el) {
          map.set(el.id, el as BoardElement);
        }
      }
    }
  } catch (err) {
    logger.error({ err, boardId }, 'Failed to parse elements from DB');
  }

  return map;
}

// ============ Получить состояние доски ============

export async function getBoardElements(boardId: string): Promise<BoardElement[]> {
  let entry = activeBoards.get(boardId);
  if (!entry) {
    const elements = await loadElements(boardId);
    entry = { elements, dirty: false, saveTimer: null };
    activeBoards.set(boardId, entry);
  }
  return Array.from(entry.elements.values());
}

// ============ Сохранение в БД (debounced) ============

function scheduleSave(boardId: string) {
  const entry = activeBoards.get(boardId);
  if (!entry) return;
  if (entry.saveTimer) return; // уже запланировано

  entry.saveTimer = setTimeout(async () => {
    const current = activeBoards.get(boardId);
    if (!current) return;

    if (!current.dirty) {
      current.saveTimer = null;
      return;
    }

    const elementsArray = Array.from(current.elements.values());
    try {
      await prisma.board.update({
        where: { id: boardId },
        data: { elements: JSON.stringify(elementsArray) },
      });
      current.dirty = false;
      logger.debug({ boardId, count: elementsArray.length }, 'Board saved');
    } catch (err) {
      logger.error({ err, boardId }, 'Failed to save board');
    } finally {
      current.saveTimer = null;
      // Если за время сохранения пришли новые изменения — сохраняем ещё раз
      if (current.dirty) scheduleSave(boardId);
    }
  }, SAVE_DEBOUNCE_MS);
}

// ============ Применить операцию ============

export function applyOperation(
  boardId: string,
  op: Operation,
  userId: string,
): { ok: boolean; error?: string } {
  const entry = activeBoards.get(boardId);
  if (!entry) return { ok: false, error: 'Board not loaded' };

  const isOwner = checkIsOwner(boardId, userId);

  switch (op.type) {
    case 'add': {
      // Проверка: элемент принадлежит пользователю
      const element: BoardElement = {
        ...op.element,
        createdBy: op.element.createdBy || userId,
        version: 1,
        updatedAt: Date.now(),
      };
      entry.elements.set(element.id, element);
      break;
    }

    case 'update': {
      const existing = entry.elements.get(op.element.id);
      if (!existing) return { ok: false, error: 'Element not found' };

      // Гость не может обновлять чужие элементы
      if (!isOwner && existing.createdBy !== userId) {
        return { ok: false, error: 'Cannot edit other users elements' };
      }

      entry.elements.set(op.element.id, {
        ...existing,
        ...op.element,
        createdBy: existing.createdBy, // не даём менять автора
        version: existing.version + 1,
        updatedAt: Date.now(),
      });
      break;
    }

    case 'remove': {
      const existing = entry.elements.get(op.elementId);
      if (!existing) return { ok: true }; // уже удалён

      // Гость не может удалять чужие элементы
      if (!isOwner && existing.createdBy !== userId) {
        return { ok: false, error: 'Cannot delete other users elements' };
      }

      entry.elements.delete(op.elementId);
      break;
    }

    case 'clear': {
      // Только владелец может очистить всю доску
      if (!isOwner) {
        return { ok: false, error: 'Only owner can clear board' };
      }
      entry.elements.clear();
      break;
    }
  }

  entry.dirty = true;
  scheduleSave(boardId);

  return { ok: true };
}

// ============ Проверка isOwner (кэшируется в entry) ============

const ownerCache = new Map<string, string>();

export function setBoardOwner(boardId: string, ownerId: string) {
  ownerCache.set(boardId, ownerId);
}

function checkIsOwner(boardId: string, userId: string): boolean {
  return ownerCache.get(boardId) === userId;
}

// ============ Очистка при удалении доски ============

export function evictBoard(boardId: string) {
  const entry = activeBoards.get(boardId);
  if (entry?.saveTimer) clearTimeout(entry.saveTimer);
  activeBoards.delete(boardId);
  ownerCache.delete(boardId);
}
