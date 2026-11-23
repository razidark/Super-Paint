export type Tool = 'brush' | 'pencil' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text' | 'bucket' | 'picker' | 'spray' | 'symmetry' | 'gradient' | 'triangle' | 'star';

export interface ImageFilters {
  brightness: number;  // 0 to 200 (100 is default)
  contrast: number;    // 0 to 200 (100 is default)
  blur: number;        // 0 to 20px (0 is default)
  grayscale: number;   // 0 to 100 (0 is default)
  sepia: number;       // 0 to 100 (0 is default)
  invert: number;      // 0 to 100 (0 is default)
}

export interface SmartTransforms {
  scaleX: number;
  scaleY: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  filters: ImageFilters;
}

/**
 * Blend modes offered in the Layers panel. Every value below is also a valid
 * `GlobalCompositeOperation`, so the same string can be handed to the canvas
 * and to CSS `mix-blend-mode` without a cast.
 */
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface LayerMetadata {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0 to 1
  blendMode?: BlendMode; // e.g. normal (source-over), multiply, screen, overlay, etc.
  isSmartObject?: boolean;
  smartObjectSource?: string;
  smartTransforms?: SmartTransforms;
}


export interface HistoryState {
  // We will store base64 or ImageData snapshot of each layer to undo/redo
  layers: {
    id: string;
    dataUrl: string;
  }[];
  activeLayerId: string;
}
