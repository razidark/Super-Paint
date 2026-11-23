import type { ImageFilters } from './types';

export const CANVAS_W = 1200;
export const CANVAS_H = 800;
export const MAX_HISTORY = 50;

export const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
};

export const FILTER_DEFS = [
  { key: 'brightness' as const, label: 'Brightness', min: 0, max: 200 },
  { key: 'contrast' as const, label: 'Contrast', min: 0, max: 200 },
  { key: 'blur' as const, label: 'Blur', min: 0, max: 20 },
  { key: 'grayscale' as const, label: 'Grayscale', min: 0, max: 100 },
  { key: 'sepia' as const, label: 'Sepia', min: 0, max: 100 },
  { key: 'invert' as const, label: 'Invert', min: 0, max: 100 },
] as const;

export const TOOL_SHORTCUTS: Record<string, import('./types').Tool> = {
  b: 'brush',
  p: 'pencil',
  e: 'eraser',
  l: 'line',
  r: 'rectangle',
  c: 'circle',
  t: 'text',
  g: 'bucket',
  i: 'picker',
};
