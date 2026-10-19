import { create } from 'zustand';
import type { BoardElement, Participant, RemoteCursor, ConnectionState, Tool } from '../types';

type HistoryEntry = {
  type: 'add' | 'update' | 'remove';
  element: BoardElement;
};

interface BoardStore {
  elements: Map<string, BoardElement>;
  tool: Tool;
  color: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  selectedId: string | null;

  participants: Participant[];
  cursors: Map<string, RemoteCursor>;
  connection: ConnectionState;
  isOwner: boolean;

  history: HistoryEntry[];
  future: HistoryEntry[];

  setElements: (elements: BoardElement[]) => void;
  applyRemoteOperation: (op: {
    type: 'add' | 'update' | 'remove' | 'clear';
    element?: BoardElement;
    elementId?: string;
  }) => void;

  addElement: (element: BoardElement) => void;
  updateElement: (element: BoardElement) => void;
  removeElement: (id: string) => void;
  clearElements: () => void;

  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (w: number) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setSelected: (id: string | null) => void;

  setParticipants: (participants: Participant[]) => void;
  addParticipant: (p: Participant) => void;
  removeParticipant: (socketId: string) => void;
  setCursor: (cursor: RemoteCursor) => void;
  removeCursor: (socketId: string) => void;
  setConnection: (state: ConnectionState) => void;
  setIsOwner: (v: boolean) => void;

  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  pushHistory: (entry: HistoryEntry) => void;
  resetHistory: () => void;
  resetBoard: () => void;
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  elements: new Map(),
  tool: 'select',
  color: '#1a1a1a',
  strokeWidth: 2,
  fontSize: 16,
  fontFamily: 'Arial',
  selectedId: null,

  participants: [],
  cursors: new Map(),
  connection: 'connecting',
  isOwner: false,

  history: [],
  future: [],

  setElements: (elements) => {
    const map = new Map<string, BoardElement>();
    for (const el of elements) map.set(el.id, el);
    set({ elements: map });
  },

  applyRemoteOperation: (op) => {
    set((state) => {
      const elements = new Map(state.elements);
      if (op.type === 'add' && op.element) elements.set(op.element.id, op.element);
      else if (op.type === 'update' && op.element) elements.set(op.element.id, op.element);
      else if (op.type === 'remove' && op.elementId) elements.delete(op.elementId);
      else if (op.type === 'clear') elements.clear();
      return { elements };
    });
  },

  addElement: (element) => set((state) => {
    const elements = new Map(state.elements);
    elements.set(element.id, element);
    return { elements };
  }),

  updateElement: (element) => set((state) => {
    const existing = state.elements.get(element.id);
    if (!existing) return state;
    const elements = new Map(state.elements);
    elements.set(element.id, { ...existing, ...element });
    return { elements };
  }),

  removeElement: (id) => set((state) => {
    const elements = new Map(state.elements);
    elements.delete(id);
    return { elements, selectedId: state.selectedId === id ? null : state.selectedId };
  }),

  clearElements: () => set({ elements: new Map(), selectedId: null }),

  setTool: (tool) => set({ tool, selectedId: null }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFontSize: (fontSize) => set({ fontSize }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setSelected: (selectedId) => set({ selectedId }),

  setParticipants: (participants) => set({ participants }),
  addParticipant: (p) => set((state) => {
    if (state.participants.some((x) => x.socketId === p.socketId)) return state;
    return { participants: [...state.participants, p] };
  }),
  removeParticipant: (socketId) => set((state) => ({
    participants: state.participants.filter((p) => p.socketId !== socketId),
    cursors: new Map([...state.cursors].filter(([k]) => k !== socketId)),
  })),
  setCursor: (cursor) => set((state) => {
    const cursors = new Map(state.cursors);
    cursors.set(cursor.socketId, cursor);
    return { cursors };
  }),
  removeCursor: (socketId) => set((state) => {
    const cursors = new Map(state.cursors);
    cursors.delete(socketId);
    return { cursors };
  }),
  setConnection: (connection) => set({ connection }),
  setIsOwner: (isOwner) => set({ isOwner }),

  pushHistory: (entry) => set((state) => ({
    history: [...state.history.slice(-49), entry],
    future: [],
  })),

  undo: () => {
    const { history, elements } = get();
    if (history.length === 0) return null;
    const entry = history[history.length - 1];
    const newElements = new Map(elements);
    if (entry.type === 'add') newElements.delete(entry.element.id);
    else if (entry.type === 'remove') newElements.set(entry.element.id, entry.element);
    set({ elements: newElements, history: history.slice(0, -1), future: [...get().future, entry] });
    return entry;
  },

  redo: () => {
    const { future, elements } = get();
    if (future.length === 0) return null;
    const entry = future[future.length - 1];
    const newElements = new Map(elements);
    if (entry.type === 'add') newElements.set(entry.element.id, entry.element);
    else if (entry.type === 'remove') newElements.delete(entry.element.id);
    set({ elements: newElements, history: [...get().history, entry], future: future.slice(0, -1) });
    return entry;
  },

  resetHistory: () => set({ history: [], future: [] }),

  resetBoard: () => set({
    elements: new Map(),
    selectedId: null,
    cursors: new Map(),
    participants: [],
    history: [],
    future: [],
    isOwner: false,
  }),
}));