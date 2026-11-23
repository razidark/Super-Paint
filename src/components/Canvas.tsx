import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import type { Tool, LayerMetadata, ImageFilters, BlendMode } from '../types';
import { applyFiltersToImageData } from './canvas/imageFilters';
import { paintBrushStroke } from './canvas/drawingEngine';
import { renderShape } from './canvas/shapeTools';
import { floodFill, sampleColor } from './canvas/fillAndPicker';

/**
 * Resolve a CSS custom property to a colour the canvas can actually use.
 *
 * `ctx.fillStyle = 'var(--text-secondary)'` is silently IGNORED by the
 * canvas API: it is not a valid colour, so the assignment is a no-op and
 * the previous colour stays. The rulers and the accent outlines therefore
 * rendered in whatever colour was set last (black by default) instead of
 * the themed one.
 *
 * The value is read from the element's computed style, so it follows the
 * active theme automatically.
 */
const resolveCssColor = (varName: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName.startsWith('--') ? varName : `--${varName}`)
    .trim();
  if (!raw) return fallback;
  // A computed custom property may still be a var() reference; resolve one
  // more level if so.
  if (raw.startsWith('var(')) return fallback;
  return raw;
};

/** Resolve several CSS variables at once. */
const resolveThemeColors = () => ({
  textSecondary: resolveCssColor('--text-secondary', '#aaaaaa'),
  textMuted: resolveCssColor('--text-muted', '#666666'),
  accent: resolveCssColor('--accent', '#3b82f6'),
});

// ---- Types ----

interface CanvasProps {
  tool: Tool;
  brushColor: string;
  fillColor: string;
  brushSize: number;
  opacity: number;
  hardness: number;
  layers: LayerMetadata[];
  activeLayerId: string;
  filters: ImageFilters;
  textContent: string;
  textFont: string;
  textSize: number;
  onPickColor: (color: string) => void;
  onPressureChange: (pressure: number) => void;
  onStrokeComplete: () => void;
  canvasWidth: number;
  canvasHeight: number;
  activeLayerIsSmartObject: boolean;
  onSmartObjectWarning?: () => void;
}

export interface CanvasHandle {
  getCompositeDataUrl: (format: string, quality: number) => string;
  getLayerDataUrl: (id: string) => string;
  clearLayer: (id: string) => void;
  clearAll: () => void;
  addLayer: (id: string) => void;
  deleteLayer: (id: string) => void;
  flattenImageData: () => ImageData | null;
  applyFiltersToLayer: (id: string, f: ImageFilters) => void;
  setLayerData: (id: string, dataUrl: string) => Promise<void>;
  flipLayer: (id: string, direction: 'horizontal' | 'vertical') => void;
  rotateLayer: (id: string, angle: number) => void;
  scaleLayer: (id: string, sx: number, sy: number) => void;
  clearGuides: () => void;
}

// ---- Component ----

const CanvasEditor = forwardRef<CanvasHandle, CanvasProps>((props, ref) => {
  const {
    tool,
    brushColor,
    fillColor,
    brushSize,
    opacity,
    hardness,
    layers,
    activeLayerId,
    filters,
    textContent,
    textFont,
    textSize,
    onPickColor,
    onPressureChange,
    onStrokeComplete,
    canvasWidth,
    canvasHeight,
    activeLayerIsSmartObject,
    onSmartObjectWarning,
  } = props;

  // Layer storage & overlay
  const layerCanvases = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const layerDataUrls = useRef<Map<string, string>>(new Map());
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drawing state (refs to avoid re-renders during strokes)
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const activeTextInput = useRef<HTMLTextAreaElement | null>(null);

  // ---- Ruler and Guide Refs & States ----
  const hrulerRef = useRef<HTMLCanvasElement | null>(null);
  const vrulerRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const guidesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rulerCursorPos = useRef({ x: 0, y: 0 });
  const draggingGuide = useRef<{ type: 'horizontal' | 'vertical'; id: string } | null>(null);

  const [guides, setGuides] = useState<{ id: string; type: 'horizontal' | 'vertical'; position: number }[]>([]);

  const drawRulers = useCallback(() => {
    const hruler = hrulerRef.current;
    const vruler = vrulerRef.current;
    const viewport = viewportRef.current;
    const canvasContainer = containerRef.current;
    if (!hruler || !vruler || !viewport || !canvasContainer) return;

    const theme = resolveThemeColors();

    const hctx = hruler.getContext('2d')!;
    const vctx = vruler.getContext('2d')!;

    if (hruler.width !== hruler.clientWidth) hruler.width = hruler.clientWidth;
    if (vruler.height !== vruler.clientHeight) vruler.height = vruler.clientHeight;

    const hw = hruler.width;
    const hh = hruler.height;
    const vw = vruler.width;
    const vh = vruler.height;

    hctx.clearRect(0, 0, hw, hh);
    vctx.clearRect(0, 0, vw, vh);

    hctx.fillStyle = theme.textSecondary;
    hctx.font = '9px monospace';
    hctx.strokeStyle = theme.textMuted;
    hctx.lineWidth = 1;

    vctx.fillStyle = theme.textSecondary;
    vctx.font = '9px monospace';
    vctx.strokeStyle = theme.textMuted;
    vctx.lineWidth = 1;

    const canvasRect = canvasContainer.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();

    const hOffset = canvasRect.left - (viewportRect.left + 20);
    const vOffset = canvasRect.top - viewportRect.top;

    const startX = Math.floor(-hOffset / 10) * 10;
    for (let x = startX; x < startX + hw + 100; x += 10) {
      const px = x + hOffset;
      if (px < 0 || px > hw) continue;

      if (x % 100 === 0) {
        hctx.beginPath();
        hctx.moveTo(px, 10);
        hctx.lineTo(px, hh);
        hctx.stroke();
        hctx.fillText(String(x), px + 2, 8);
      } else if (x % 50 === 0) {
        hctx.beginPath();
        hctx.moveTo(px, 14);
        hctx.lineTo(px, hh);
        hctx.stroke();
      } else {
        hctx.beginPath();
        hctx.moveTo(px, 17);
        hctx.lineTo(px, hh);
        hctx.stroke();
      }
    }

    const startY = Math.floor(-vOffset / 10) * 10;
    for (let y = startY; y < startY + vh + 100; y += 10) {
      const py = y + vOffset;
      if (py < 0 || py > vh) continue;

      if (y % 100 === 0) {
        vctx.beginPath();
        vctx.moveTo(10, py);
        vctx.lineTo(vw, py);
        vctx.stroke();
        vctx.save();
        vctx.translate(2, py + 10);
        vctx.rotate(-Math.PI / 2);
        vctx.fillText(String(y), 0, 0);
        vctx.restore();
      } else if (y % 50 === 0) {
        vctx.beginPath();
        vctx.moveTo(14, py);
        vctx.lineTo(vw, py);
        vctx.stroke();
      } else {
        vctx.beginPath();
        vctx.moveTo(17, py);
        vctx.lineTo(vw, py);
        vctx.stroke();
      }
    }

    const trackX = rulerCursorPos.current.x * (canvasRect.width / canvasWidth) + hOffset;
    const trackY = rulerCursorPos.current.y * (canvasRect.height / canvasHeight) + vOffset;

    hctx.strokeStyle = theme.accent;
    hctx.lineWidth = 1;
    hctx.beginPath();
    hctx.moveTo(trackX, 0);
    hctx.lineTo(trackX, hh);
    hctx.stroke();

    vctx.strokeStyle = theme.accent;
    vctx.lineWidth = 1;
    vctx.beginPath();
    vctx.moveTo(0, trackY);
    vctx.lineTo(vw, trackY);
    vctx.stroke();
  }, [canvasWidth, canvasHeight]);

  const drawOverlayWithGuides = (dragPos: number, type: 'horizontal' | 'vertical') => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = 'rgba(255, 0, 127, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);

    if (type === 'horizontal') {
      ctx.beginPath();
      ctx.moveTo(0, dragPos);
      ctx.lineTo(canvasWidth, dragPos);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(dragPos, 0);
      ctx.lineTo(dragPos, canvasHeight);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  };

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLCanvasElement>, type: 'horizontal' | 'vertical') => {
    e.preventDefault();
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    
    const guideId = `guide-${Date.now()}`;
    draggingGuide.current = { type, id: guideId };

    const moveHandler = (moveEv: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let pos: number;
      
      if (type === 'horizontal') {
        pos = (moveEv.clientY - rect.top) * (canvasHeight / rect.height);
      } else {
        pos = (moveEv.clientX - rect.left) * (canvasWidth / rect.width);
      }

      drawOverlayWithGuides(pos, type);
    };

    const upHandler = (upEv: PointerEvent) => {
      canvas.releasePointerCapture(e.pointerId);
      window.removeEventListener('pointermove', moveHandler);
      window.removeEventListener('pointerup', upHandler);

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let finalPos = 0;
      
      if (type === 'horizontal') {
        finalPos = (upEv.clientY - rect.top) * (canvasHeight / rect.height);
      } else {
        finalPos = (upEv.clientX - rect.left) * (canvasWidth / rect.width);
      }

      setGuides((prev) => [...prev, { id: guideId, type, position: finalPos }]);
      draggingGuide.current = null;
      
      const overlay = overlayRef.current;
      if (overlay) {
        const ctx = overlay.getContext('2d')!;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      }
    };

    window.addEventListener('pointermove', moveHandler);
    window.addEventListener('pointerup', upHandler);
  };

  // Redraw persistent guides on guide canvas
  useEffect(() => {
    const canvas = guidesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = 'rgba(0, 220, 220, 0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (const guide of guides) {
      if (guide.type === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(0, guide.position);
        ctx.lineTo(canvasWidth, guide.position);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(guide.position, 0);
        ctx.lineTo(guide.position, canvasHeight);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }, [guides, canvasWidth, canvasHeight]);

  useEffect(() => {
    drawRulers();
    window.addEventListener('resize', drawRulers);
    return () => window.removeEventListener('resize', drawRulers);
  }, [drawRulers]);

  // ---- Imperative API for parent ----
  useImperativeHandle(ref, () => ({
    getCompositeDataUrl(format: string, quality: number) {
      const tmp = document.createElement('canvas');
      tmp.width = canvasWidth;
      tmp.height = canvasHeight;
      const ctx = tmp.getContext('2d')!;
      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
      for (const layer of layers) {
        if (!layer.visible) continue;
        const c = layerCanvases.current.get(layer.id);
        if (!c) continue;
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = mapBlendModeToCompositeOp(layer.blendMode);
        ctx.drawImage(c, 0, 0);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      return tmp.toDataURL(`image/${format}`, quality);
    },
    getLayerDataUrl(id: string) {
      const c = layerCanvases.current.get(id);
      const url = c ? c.toDataURL() : '';
      if (url) {
        layerDataUrls.current.set(id, url);
      }
      return url;
    },
    clearLayer(id: string) {
      layerCanvases.current
        .get(id)
        ?.getContext('2d')
        ?.clearRect(0, 0, canvasWidth, canvasHeight);
      layerDataUrls.current.delete(id);
    },
    clearAll() {
      for (const c of layerCanvases.current.values()) {
        c.getContext('2d')?.clearRect(0, 0, canvasWidth, canvasHeight);
      }
      layerDataUrls.current.clear();
    },
    addLayer(id: string) {
      if (layerCanvases.current.has(id)) return;
      const c = document.createElement('canvas');
      c.width = canvasWidth;
      c.height = canvasHeight;
      layerCanvases.current.set(id, c);
    },
    deleteLayer(id: string) {
      layerCanvases.current.delete(id);
      layerDataUrls.current.delete(id);
    },
    flattenImageData() {
      const tmp = document.createElement('canvas');
      tmp.width = canvasWidth;
      tmp.height = canvasHeight;
      const ctx = tmp.getContext('2d')!;
      for (const layer of layers) {
        if (!layer.visible) continue;
        const c = layerCanvases.current.get(layer.id);
        if (!c) continue;
        ctx.globalAlpha = layer.opacity;
        ctx.globalCompositeOperation = mapBlendModeToCompositeOp(layer.blendMode);
        ctx.drawImage(c, 0, 0);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      return ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    },
    applyFiltersToLayer(id: string, f: ImageFilters) {
      const c = layerCanvases.current.get(id);
      if (!c) return;
      const ctx = c.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      applyFiltersToImageData(imageData, f);
      ctx.putImageData(imageData, 0, 0);
      layerDataUrls.current.set(id, c.toDataURL());
    },
    setLayerData(id: string, dataUrl: string): Promise<void> {
      layerDataUrls.current.set(id, dataUrl);
      const c = layerCanvases.current.get(id);
      if (!c) return Promise.resolve();
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      if (!dataUrl) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const hRatio = canvasWidth / img.width;
          const vRatio = canvasHeight / img.height;
          const ratio = Math.min(1, hRatio, vRatio);
          const w = img.width * ratio;
          const h = img.height * ratio;
          const x = (canvasWidth - w) / 2;
          const y = (canvasHeight - h) / 2;
          ctx.drawImage(img, x, y, w, h);
          layerDataUrls.current.set(id, c.toDataURL());
          resolve();
        };
        img.src = dataUrl;
      });
    },
    flipLayer(id: string, direction: 'horizontal' | 'vertical') {
      const c = layerCanvases.current.get(id);
      if (!c) return;
      const ctx = c.getContext('2d')!;

      const tmp = document.createElement('canvas');
      tmp.width = canvasWidth;
      tmp.height = canvasHeight;
      const tmpCtx = tmp.getContext('2d')!;
      tmpCtx.drawImage(c, 0, 0);

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.save();
      if (direction === 'horizontal') {
        ctx.translate(canvasWidth, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, canvasHeight);
        ctx.scale(1, -1);
      }
      ctx.drawImage(tmp, 0, 0);
      ctx.restore();

      layerDataUrls.current.set(id, c.toDataURL());
    },
    rotateLayer(id: string, angle: number) {
      const c = layerCanvases.current.get(id);
      if (!c) return;
      const ctx = c.getContext('2d')!;

      const tmp = document.createElement('canvas');
      tmp.width = canvasWidth;
      tmp.height = canvasHeight;
      const tmpCtx = tmp.getContext('2d')!;
      tmpCtx.drawImage(c, 0, 0);

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(tmp, -canvasWidth / 2, -canvasHeight / 2);
      ctx.restore();

      layerDataUrls.current.set(id, c.toDataURL());
    },
    scaleLayer(id: string, sx: number, sy: number) {
      const c = layerCanvases.current.get(id);
      if (!c) return;
      const ctx = c.getContext('2d')!;

      const tmp = document.createElement('canvas');
      tmp.width = canvasWidth;
      tmp.height = canvasHeight;
      const tmpCtx = tmp.getContext('2d')!;
      tmpCtx.drawImage(c, 0, 0);

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.save();
      ctx.translate(canvasWidth / 2, canvasHeight / 2);
      ctx.scale(sx, sy);
      ctx.drawImage(tmp, -canvasWidth / 2, -canvasHeight / 2);
      ctx.restore();

      layerDataUrls.current.set(id, c.toDataURL());
    },
    clearGuides() {
      setGuides([]);
    }
  }));

  // ---- Layer canvas registration ----
  const registerLayerCanvas = useCallback(
    (id: string, el: HTMLCanvasElement | null) => {
      if (el) {
        const wasNew = !layerCanvases.current.has(id);
        layerCanvases.current.set(id, el);
        if (wasNew) {
          const cachedUrl = layerDataUrls.current.get(id);
          if (cachedUrl) {
            const ctx = el.getContext('2d');
            if (ctx) {
              const img = new Image();
              img.onload = () => ctx.drawImage(img, 0, 0);
              img.src = cachedUrl;
            }
          }
        }
      } else if (!el) {
        layerCanvases.current.delete(id);
      }
    },
    []
  );

  // ---- Helpers ----
  const getActiveCtx = useCallback(
    (): CanvasRenderingContext2D | null =>
      layerCanvases.current.get(activeLayerId)?.getContext('2d') ?? null,
    [activeLayerId]
  );

  const getPos = useCallback(
    (e: PointerEvent): { x: number; y: number } => {
      const overlay = overlayRef.current;
      if (!overlay) return { x: 0, y: 0 };
      const rect = overlay.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvasWidth / rect.width),
        y: (e.clientY - rect.top) * (canvasHeight / rect.height),
      };
    },
    [canvasWidth, canvasHeight]
  );

  // ---- Tool callbacks ----
  const doPaint = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      pressure: number,
      isFirst: boolean
    ) => {
      paintBrushStroke(ctx, x, y, pressure, isFirst, lastPos.current, {
        brushColor,
        brushSize,
        opacity,
        hardness,
        tool,
      });

      if (tool === 'symmetry') {
        const mirroredX = canvasWidth - x;
        const lastMirroredX = canvasWidth - lastPos.current.x;
        paintBrushStroke(
          ctx,
          mirroredX,
          y,
          pressure,
          isFirst,
          { x: lastMirroredX, y: lastPos.current.y },
          {
            brushColor,
            brushSize,
            opacity,
            hardness,
            tool: 'brush',
          }
        );
      }
    },
    [brushColor, brushSize, opacity, hardness, tool, canvasWidth]
  );

  const doPickColor = useCallback(
    (x: number, y: number) => {
      const hex = sampleColor(layerCanvases.current, layers, x, y);
      if (hex) onPickColor(hex);
    },
    [layers, onPickColor]
  );

  const doBucketFill = useCallback(
    (x: number, y: number) => {
      const canvas = layerCanvases.current.get(activeLayerId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      floodFill(imageData, canvasWidth, canvasHeight, x, y, fillColor);
      ctx.putImageData(imageData, 0, 0);
    },
    [activeLayerId, canvasWidth, canvasHeight, fillColor]
  );

  const shapeStyle = useCallback(
    () => ({
      strokeColor: brushColor,
      fillColor,
      lineWidth: brushSize,
      opacity,
    }),
    [brushColor, fillColor, brushSize, opacity]
  );

  const doShapePreview = useCallback(
    (x: number, y: number) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext('2d')!;
      const theme = resolveThemeColors();
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      if (tool === 'gradient') {
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(startPos.current.x, startPos.current.y, 4, 0, Math.PI * 2);
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      renderShape(ctx, tool, startPos.current, { x, y }, shapeStyle());
    },
    [tool, canvasWidth, canvasHeight, shapeStyle]
  );

  const doCommitShape = useCallback(
    (x: number, y: number) => {
      const ctx = getActiveCtx();
      if (!ctx) return;

      if (tool === 'gradient') {
        ctx.globalAlpha = opacity;
        const grad = ctx.createLinearGradient(startPos.current.x, startPos.current.y, x, y);
        grad.addColorStop(0, brushColor);
        grad.addColorStop(1, fillColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.globalAlpha = 1;
        
        overlayRef.current
          ?.getContext('2d')
          ?.clearRect(0, 0, canvasWidth, canvasHeight);
        return;
      }

      renderShape(ctx, tool, startPos.current, { x, y }, shapeStyle());
      overlayRef.current
        ?.getContext('2d')
        ?.clearRect(0, 0, canvasWidth, canvasHeight);
    },
    [tool, getActiveCtx, canvasWidth, canvasHeight, shapeStyle, brushColor, fillColor, opacity]
  );

  const doCommitText = useCallback(
    (x: number, y: number) => {
      const ctx = getActiveCtx();
      if (!ctx) return;
      const text = activeTextInput.current?.value ?? textContent;
      if (!text.trim()) return;
      ctx.globalAlpha = opacity;
      ctx.fillStyle = brushColor;
      ctx.font = `${textSize}px ${textFont}`;
      ctx.fillText(text, x, y);
      ctx.globalAlpha = 1;
      activeTextInput.current?.remove();
      activeTextInput.current = null;
    },
    [brushColor, opacity, textFont, textSize, textContent, getActiveCtx]
  );

  // ---- Pointer event wiring ----
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const onPointerDown = (e: PointerEvent) => {
      if (activeLayerIsSmartObject && tool !== 'picker') {
        onSmartObjectWarning?.();
        return;
      }
      overlay.setPointerCapture(e.pointerId);
      const pos = getPos(e);
      rulerCursorPos.current = pos;
      drawRulers();
      const pressure = e.pointerType === 'pen' ? (e.pressure > 0 ? e.pressure : 1) : 1;
      onPressureChange(pressure);

      isDrawing.current = true;
      startPos.current = pos;
      lastPos.current = pos;

      if (tool === 'picker') {
        doPickColor(pos.x, pos.y);
        return;
      }
      if (tool === 'bucket') {
        doBucketFill(pos.x, pos.y);
        onStrokeComplete();
        return;
      }
      if (tool === 'text') {
        activeTextInput.current?.remove();
        const textarea = document.createElement('textarea');
        textarea.className = 'text-input-overlay';
        textarea.style.left = `${e.clientX}px`;
        textarea.style.top = `${e.clientY}px`;
        textarea.style.fontSize = `${textSize}px`;
        textarea.style.fontFamily = textFont;
        textarea.style.color = brushColor;
        textarea.style.position = 'fixed';
        textarea.placeholder = 'Type here...';
        document.body.appendChild(textarea);
        textarea.focus();
        activeTextInput.current = textarea;
        textarea.addEventListener('keydown', (ke) => {
          if (ke.key === 'Escape' || (ke.key === 'Enter' && !ke.shiftKey)) {
            doCommitText(pos.x, pos.y);
            onStrokeComplete();
          }
        });
        return;
      }
      if (tool === 'brush' || tool === 'pencil' || tool === 'eraser' || tool === 'spray' || tool === 'symmetry') {
        const ctx = getActiveCtx();
        if (!ctx) return;
        doPaint(ctx, pos.x, pos.y, pressure, true);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const pos = getPos(e);
      rulerCursorPos.current = pos;
      drawRulers();

      if (!isDrawing.current) return;
      const pressure = e.pointerType === 'pen' ? (e.pressure > 0 ? e.pressure : 1) : 1;
      onPressureChange(pressure);

      if (tool === 'picker') {
        doPickColor(pos.x, pos.y);
      } else if (tool === 'brush' || tool === 'pencil' || tool === 'eraser' || tool === 'spray' || tool === 'symmetry') {
        const ctx = getActiveCtx();
        if (ctx) doPaint(ctx, pos.x, pos.y, pressure, false);
      } else if (tool === 'line' || tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'star' || tool === 'gradient') {
        doShapePreview(pos.x, pos.y);
      }

      lastPos.current = pos;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const pos = getPos(e);

      if (tool === 'line' || tool === 'rectangle' || tool === 'circle' || tool === 'triangle' || tool === 'star' || tool === 'gradient') {
        doCommitShape(pos.x, pos.y);
        onStrokeComplete();
      } else if (tool === 'brush' || tool === 'pencil' || tool === 'eraser' || tool === 'spray' || tool === 'symmetry') {
        onStrokeComplete();
      }

      onPressureChange(0);
    };

    overlay.addEventListener('pointerdown', onPointerDown);
    overlay.addEventListener('pointermove', onPointerMove);
    overlay.addEventListener('pointerup', onPointerUp);
    overlay.addEventListener('pointercancel', onPointerUp);

    return () => {
      overlay.removeEventListener('pointerdown', onPointerDown);
      overlay.removeEventListener('pointermove', onPointerMove);
      overlay.removeEventListener('pointerup', onPointerUp);
      overlay.removeEventListener('pointercancel', onPointerUp);
    };
  }, [
    tool,
    doPaint,
    doPickColor,
    doBucketFill,
    doShapePreview,
    doCommitShape,
    doCommitText,
    getActiveCtx,
    getPos,
    onPressureChange,
    onStrokeComplete,
    textFont,
    textSize,
    brushColor,
    canvasWidth,
    canvasHeight,
  ]);

  // ---- Smart Object Non-Destructive Rendering ----
  useEffect(() => {
    layers.forEach((layer) => {
      if (layer.isSmartObject && layer.smartObjectSource) {
        const c = layerCanvases.current.get(layer.id);
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;

        // Clear layer canvas first
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const img = new Image();
        img.onload = () => {
          ctx.save();

          const t = layer.smartTransforms || {
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            filters: { brightness: 100, contrast: 100, blur: 0, grayscale: 0, sepia: 0, invert: 0 }
          };

          // Translate to center of canvas + offsets
          ctx.translate(canvasWidth / 2 + t.offsetX, canvasHeight / 2 + t.offsetY);
          // Rotate
          ctx.rotate((t.rotation * Math.PI) / 180);
          // Scale
          ctx.scale(t.scaleX, t.scaleY);

          // Apply non-destructive filter on context if supported
          if (ctx.filter !== undefined) {
            ctx.filter = getCssFilterString(t.filters);
          }

          // Draw image centered relative to transform center
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          
          ctx.restore();

          // Keep current state saved for rendering
          layerDataUrls.current.set(layer.id, c.toDataURL());
        };
        img.src = layer.smartObjectSource;
      }
    });
  }, [layers, canvasWidth, canvasHeight]);

  // ---- Cursor ----
  const getCursor = () => {
    if (tool === 'picker') return 'cell';
    if (tool === 'bucket') return 'crosshair';
    if (tool === 'text') return 'text';
    if (tool === 'eraser') return 'none';
    return 'crosshair';
  };

  // ---- Render ----
  return (
    <div
      className="canvas-workspace-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-darkest)'
      }}
    >
      {/* Top Ruler Bar */}
      <div
        style={{
          display: 'flex',
          height: '20px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            background: 'var(--bg-darkest)',
            borderRight: '1px solid var(--border)',
            flexShrink: 0
          }}
        />
        <canvas
          ref={hrulerRef}
          height={20}
          style={{
            flex: 1,
            display: 'block',
            cursor: 'row-resize',
            height: '20px'
          }}
          onPointerDown={(e) => handleRulerPointerDown(e, 'horizontal')}
          title="Drag down to place a horizontal alignment guide"
        />
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Left Ruler Bar */}
        <canvas
          ref={vrulerRef}
          width={20}
          style={{
            flexShrink: 0,
            height: '100%',
            borderRight: '1px solid var(--border)',
            display: 'block',
            cursor: 'col-resize',
            width: '20px',
            position: 'sticky',
            left: 0,
            zIndex: 40,
            background: 'var(--bg-panel)'
          }}
          onPointerDown={(e) => handleRulerPointerDown(e, 'vertical')}
          title="Drag right to place a vertical alignment guide"
        />

        {/* Scrollable Viewport Area */}
        <div
          ref={viewportRef}
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-darkest)',
            padding: '60px',
            position: 'relative',
            outline: 'none'
          }}
          onScroll={drawRulers}
        >
          <div
            ref={containerRef}
            className="canvas-wrapper canvas-checker"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              position: 'relative',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              border: '1px solid #000000',
              flexShrink: 0
            }}
          >
            {layers.map((layer) => {
              const isActive = layer.id === activeLayerId;
              return (
                <canvas
                  key={layer.id}
                  ref={(el) => registerLayerCanvas(layer.id, el)}
                  className="canvas-layer"
                  width={canvasWidth}
                  height={canvasHeight}
                  style={{
                    opacity: layer.visible ? layer.opacity : 0,
                    pointerEvents: 'none',
                    width: canvasWidth,
                    height: canvasHeight,
                    filter: isActive ? getCssFilterString(filters) : 'none',
                    mixBlendMode: layer.blendMode || 'normal'
                  }}
                />
              );
            })}

            {/* Cyan Guides Overlay */}
            <canvas
              ref={guidesCanvasRef}
              className="canvas-layer"
              width={canvasWidth}
              height={canvasHeight}
              style={{
                pointerEvents: 'none',
                width: canvasWidth,
                height: canvasHeight,
                zIndex: 9
              }}
            />

            <canvas
              ref={overlayRef}
              className="canvas-layer"
              width={canvasWidth}
              height={canvasHeight}
              style={{
                cursor: getCursor(),
                width: canvasWidth,
                height: canvasHeight,
                zIndex: 10,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

// ---- Blend mode & CSS filter helper utilities ----

function mapBlendModeToCompositeOp(blendMode?: BlendMode): GlobalCompositeOperation {
  if (!blendMode) return 'source-over';
  if (blendMode === 'normal') return 'source-over';
  return blendMode;
}

const getCssFilterString = (f: ImageFilters) => {
  if (!f) return 'none';
  const parts = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
  if (f.grayscale > 0) parts.push(`grayscale(${f.grayscale}%)`);
  if (f.sepia > 0) parts.push(`sepia(${f.sepia}%)`);
  if (f.invert > 0) parts.push(`invert(${f.invert}%)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
};

CanvasEditor.displayName = 'CanvasEditor';
export default CanvasEditor;
