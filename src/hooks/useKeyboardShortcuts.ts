import { useEffect } from 'react';
import type { Tool } from '../types';
import { TOOL_SHORTCUTS } from '../constants';

interface ShortcutHandlers {
  undo: () => void;
  redo: () => void;
  handleSave: () => void;
  handlePrint: () => void;
  setTool: (tool: Tool) => void;
  setBrushSize: React.Dispatch<React.SetStateAction<number>>;
}

export function useKeyboardShortcuts({
  undo,
  redo,
  handleSave,
  handlePrint,
  setTool,
  setBrushSize,
}: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      )
        return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }

      // Save / Print
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }

      // Tool shortcuts (single key, no modifier)
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && TOOL_SHORTCUTS[e.key]) {
        setTool(TOOL_SHORTCUTS[e.key]);
      }

      // Brush size with bracket keys
      if (e.key === '[') setBrushSize((s) => Math.max(1, s - 2));
      if (e.key === ']') setBrushSize((s) => Math.min(200, s + 2));
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, handleSave, handlePrint, setTool, setBrushSize]);
}
