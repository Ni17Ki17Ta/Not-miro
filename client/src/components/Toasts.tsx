import { create } from 'zustand';
import { useEffect, useState } from 'react';
import type { Toast, ToastType } from '../types';

// ============ Zustand-стор для тостов ============

interface ToastStore {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number) => void;
  remove: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  add: (message, type = 'info', duration = 4000) => {
    const id = `toast-${++counter}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  remove: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

// ============ Хелперы для удобного вызова ============

export const toast = {
  info: (msg: string) => useToastStore.getState().add(msg, 'info'),
  success: (msg: string) => useToastStore.getState().add(msg, 'success'),
  error: (msg: string) => useToastStore.getState().add(msg, 'error'),
};

// ============ Компонент ============

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type}`}
          onClick={() => remove(t.id)}
          role="alert"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}