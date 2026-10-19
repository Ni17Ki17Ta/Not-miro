import { useEffect } from 'react';
import { useBoardStore } from '../store/board';

export function useHotkeys(onUndo: () => void, onRedo: () => void) {
  const selectedId = useBoardStore((s) => s.selectedId);
  const removeElement = useBoardStore((s) => s.removeElement);
  const pushHistory = useBoardStore((s) => s.pushHistory);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      // Ctrl+Z / Cmd+Z — отменить
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }
      // Ctrl+Y / Ctrl+Shift+Z — повторить
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Delete / Backspace — удалить выделенное
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        const elements = useBoardStore.getState().elements;
        const el = elements.get(selectedId);
        if (el) {
          removeElement(selectedId);
          pushHistory({ type: 'remove', element: el });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, selectedId, removeElement, pushHistory]);
}